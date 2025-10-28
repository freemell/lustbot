const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const config = require('./config');

// Rate limiting to avoid API limits
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// Wallet address validation regex
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Function to validate Solana wallet address
function isValidSolanaAddress(address) {
  return SOLANA_ADDRESS_REGEX.test(address);
}

// Rate limiting function
function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitMap.set(userId, validRequests);
  return true;
}

// Function to get wallet information using multiple APIs
async function getWalletInfo(address) {
  try {
    // Try Solscan API first
    try {
      const headers = {
        'Authorization': `Bearer ${config.SOLSCAN_API_KEY}`,
        'Content-Type': 'application/json'
      };

      const [accountResponse, tokensResponse, txResponse] = await Promise.all([
        axios.get(`https://api.solscan.io/account?address=${address}`, { headers }),
        axios.get(`https://api.solscan.io/account/tokens?address=${address}`, { headers }),
        axios.get(`https://api.solscan.io/account/transactions?address=${address}&limit=1000`, { headers })
      ]);

      return {
        account: accountResponse.data,
        tokens: tokensResponse.data,
        transactions: txResponse.data,
        source: 'solscan'
      };
    } catch (solscanError) {
      console.log('Solscan API failed, trying alternative APIs...');
      
      // Fallback to Solana RPC and other APIs
      return await getWalletInfoFallback(address);
    }
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    throw new Error('Failed to fetch wallet information');
  }
}

// Fallback function using Solana RPC and other APIs
async function getWalletInfoFallback(address) {
  try {
    // Use Solana RPC for basic account info
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    
    const accountInfoResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        address,
        { encoding: 'base64' }
      ]
    });

    const accountInfo = accountInfoResponse.data.result?.value;
    
    if (!accountInfo) {
      throw new Error('Account not found');
    }

    // Get token accounts
    const tokenAccountsResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 2,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    });

    const tokenAccounts = tokenAccountsResponse.data.result?.value || [];
    
    // Get ALL transaction signatures (not just recent ones)
    const signaturesResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 3,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 1000 }] // Get more transactions for better accuracy
    });

    const signatures = signaturesResponse.data.result || [];

    // Process token accounts to get token info
    const tokens = tokenAccounts.map(account => {
      const parsed = account.account.data.parsed.info;
      return {
        tokenAmount: {
          uiAmount: parsed.tokenAmount?.uiAmount || 0,
          amount: parsed.tokenAmount?.amount || '0'
        },
        tokenSymbol: 'Unknown',
        tokenName: 'Unknown Token',
        mint: parsed.mint
      };
    });

    // Create account data structure with accurate transaction count
    const accountData = {
      lamports: accountInfo.lamports || 0,
      executable: accountInfo.executable || false,
      transactionCount: signatures.length
    };

    return {
      account: accountData,
      tokens: tokens,
      transactions: signatures.map(sig => ({
        blockTime: sig.blockTime,
        signature: sig.signature
      })),
      source: 'rpc'
    };

  } catch (error) {
    console.error('Fallback API also failed:', error);
    throw new Error('All APIs failed to fetch wallet information');
  }
}

// Function to format wallet information
function formatWalletInfo(walletData, address) {
  const { account, tokens, transactions, source } = walletData;
  
  // Calculate wallet age and activity
  let walletAge = 'Unknown';
  let lastActivity = 'Unknown';
  let activityLevel = 'Low';
  
  if (transactions && transactions.length > 0) {
    // Sort transactions by blockTime to get first and last
    const sortedTxs = transactions.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
    const firstTx = sortedTxs[0];
    const lastTx = sortedTxs[sortedTxs.length - 1];
    
    // Calculate wallet age from first transaction
    if (firstTx.blockTime) {
      const firstTxDate = new Date(firstTx.blockTime * 1000);
      const now = new Date();
      const diffTime = now - firstTxDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);
      
      if (diffYears > 0) {
        walletAge = `${diffYears} year${diffYears > 1 ? 's' : ''} old`;
      } else if (diffMonths > 0) {
        walletAge = `${diffMonths} month${diffMonths > 1 ? 's' : ''} old`;
      } else if (diffDays > 0) {
        walletAge = `${diffDays} day${diffDays > 1 ? 's' : ''} old`;
      } else {
        walletAge = 'Less than a day old';
      }
    }
    
    // Calculate last activity
    if (lastTx.blockTime) {
      const lastTxDate = new Date(lastTx.blockTime * 1000);
      const now = new Date();
      const diffTime = now - lastTxDate;
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 60) {
        lastActivity = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        lastActivity = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 30) {
        lastActivity = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        lastActivity = `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
      }
    }
    
    // Determine activity level based on transaction count and recency
    const txCount = transactions.length;
    const recentTxs = transactions.filter(tx => {
      if (!tx.blockTime) return false;
      const txDate = new Date(tx.blockTime * 1000);
      const now = new Date();
      const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 30; // Transactions in last 30 days
    }).length;
    
    if (txCount > 1000) activityLevel = 'Very High';
    else if (txCount > 500) activityLevel = 'High';
    else if (txCount > 100) activityLevel = 'Medium';
    else if (txCount > 10) activityLevel = 'Low';
    else activityLevel = 'Very Low';
    
    // Adjust activity level based on recent activity
    if (recentTxs > 50) activityLevel = 'Very High';
    else if (recentTxs > 20) activityLevel = 'High';
    else if (recentTxs > 5) activityLevel = 'Medium';
  }
  
  // Format SOL balance with more precision
  const solBalance = account?.lamports ? (account.lamports / 1e9).toFixed(6) : '0';
  const usdValue = ''; // USD value not available in fallback mode
  
  // Format token holdings with better details
  let tokenHoldings = 'No tokens found';
  let totalTokenValue = 0;
  
  if (tokens && tokens.length > 0) {
    // Sort tokens by balance
    const sortedTokens = tokens.sort((a, b) => {
      const aValue = a.tokenAmount?.uiAmount || 0;
      const bValue = b.tokenAmount?.uiAmount || 0;
      return bValue - aValue;
    });
    
    tokenHoldings = sortedTokens.slice(0, 8).map(token => {
      const balance = token.tokenAmount?.uiAmount || 0;
      const symbol = token.tokenSymbol || 'Unknown';
      const name = token.tokenName || 'Unknown Token';
      
      if (source === 'solscan' && token.tokenPrice) {
        const value = balance * token.tokenPrice;
        totalTokenValue += value;
        return `• ${symbol}: ${balance.toLocaleString()} ($${value.toFixed(2)})`;
      } else {
        return `• ${symbol}: ${balance.toLocaleString()}`;
      }
    }).join('\n');
    
    if (tokens.length > 8) {
      tokenHoldings += `\n... and ${tokens.length - 8} more tokens`;
    }
  }
  
  // Get transaction count
  const txCount = account?.transactionCount || 0;
  
  // Staking information (not available in fallback mode)
  let stakingInfo = '';
  // Note: Staking info would need additional RPC calls in fallback mode
  
  // Format the message
  const dataSource = source === 'solscan' ? 'Solscan API' : 'Solana RPC';
  const message = `🔍 **Wallet Analysis Report**

📍 **Address:** \`${address}\`

💰 **SOL Balance:** ${solBalance} SOL${usdValue}

🪙 **Token Holdings:** ${tokens ? tokens.length : 0} tokens
${tokenHoldings}

${totalTokenValue > 0 ? `💎 **Total Token Value:** $${totalTokenValue.toFixed(2)}\n` : ''}📊 **Transaction Count:** ${txCount.toLocaleString()}${txCount >= 1000 ? ' (showing recent 1000)' : ''}
📈 **Activity Level:** ${activityLevel}
⏰ **Wallet Age:** ${walletAge}
🕐 **Last Activity:** ${lastActivity}

🔗 **Account Type:** ${account?.executable ? 'Executable' : 'Non-executable'}${stakingInfo}

📡 **Data Source:** ${dataSource}

---
*This was made by milla*`;

  return message;
}

// Function to create inline keyboard
function createInlineKeyboard(address) {
  return Markup.inlineKeyboard([
    [
      Markup.button.url('💼 DM for Job', 'https://t.me/millw14'),
      Markup.button.url('🔍 View on Solscan', `https://solscan.io/account/${address}`)
    ]
  ]);
}

// Handle text messages
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const userId = ctx.from.id;
  
  // Check if message contains a wallet address
  const words = message.split(/\s+/);
  let walletAddress = null;
  
  for (const word of words) {
    if (isValidSolanaAddress(word)) {
      walletAddress = word;
      break;
    }
  }
  
  // Only process if a valid wallet address is found
  if (!walletAddress) {
    return; // Don't respond to messages without wallet addresses
  }
  
  // Check rate limit only when processing wallet addresses
  if (!checkRateLimit(userId)) {
    return ctx.reply('⏰ Rate limit exceeded. Please wait a moment before making another request.');
  }
  
  // Send loading message
  const loadingMessage = await ctx.reply('🔍 Analyzing wallet... Please wait.');
  
  try {
    // Get wallet information
    const walletData = await getWalletInfo(walletAddress);
    
    // Format the response
    const formattedInfo = formatWalletInfo(walletData, walletAddress);
    const keyboard = createInlineKeyboard(walletAddress);
    
    // Edit the loading message with the results
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      null,
      formattedInfo,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }
    );
    
  } catch (error) {
    console.error('Error processing wallet:', error);
    
    let errorMessage = '❌ Error: Could not fetch wallet information.';
    
    // Provide more specific error messages
    if (error.message.includes('Failed to fetch wallet information')) {
      errorMessage = '❌ Error: Could not fetch wallet information. The address might be invalid or the API is temporarily unavailable.';
    } else if (error.response?.status === 429) {
      errorMessage = '❌ Error: API rate limit exceeded. Please try again in a few minutes.';
    } else if (error.response?.status === 404) {
      errorMessage = '❌ Error: Wallet address not found. Please check the address and try again.';
    }
    
    // Edit loading message with error
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      null,
      errorMessage,
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('💼 DM for Job', 'https://t.me/millw14')]
        ]).reply_markup
      }
    );
  }
});

// Handle start command
bot.start((ctx) => {
  ctx.reply(
    `🤖 **Wallet Info Bot**\n\n` +
    `I automatically detect and analyze Solana wallet addresses in messages!\n\n` +
    `**What I provide:**\n` +
    `• SOL balance\n` +
    `• Token holdings\n` +
    `• Transaction count\n` +
    `• Wallet age\n` +
    `• Activity level\n` +
    `• And more!\n\n` +
    `**How to use:**\n` +
    `Just send a message containing a wallet address like:\n` +
    `\`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`\n\n` +
    `I'll only respond when I detect a valid wallet address!`,
    { parse_mode: 'Markdown' }
  );
});

// Handle help command
bot.help((ctx) => {
  ctx.reply(
    `📖 **How to use this bot:**\n\n` +
    `1. Send a message containing a Solana wallet address\n` +
    `2. I'll automatically detect and analyze the wallet\n` +
    `3. Use the buttons to DM for jobs or view on Solscan\n\n` +
    `**Examples:**\n` +
    `• \`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`\n` +
    `• Check this wallet: \`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`\n` +
    `• What about \`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`?\n\n` +
    `**Note:** I only respond when I detect a valid Solana wallet address in your message.`,
    { parse_mode: 'Markdown' }
  );
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start the bot
bot.launch().then(() => {
  console.log('🤖 Wallet Info Bot is running!');
}).catch((err) => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
