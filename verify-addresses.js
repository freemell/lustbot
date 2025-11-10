const axios = require('axios');
const config = require('./config');

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TOKEN_LIST_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';

const tokenMetadataCache = new Map();
let tokenListPromise = null;
let solscanMetaFailures = 0;

function isWalletAccount(account) {
  if (!account) {
    return false;
  }

  if (account.owner) {
    if (account.owner === SYSTEM_PROGRAM_ID) {
      return true;
    }
    return false;
  }

  if (account.ownerProgram) {
    const loweredOwner = String(account.ownerProgram).toLowerCase();
    if (loweredOwner.includes('system')) {
      return true;
    }
    if (loweredOwner.includes('token') || loweredOwner.includes('program') || loweredOwner.includes('contract')) {
      return false;
    }
  }

  if (typeof account.executable === 'boolean') {
    return account.executable === false;
  }

  if (account.type && typeof account.type === 'string') {
    const lowered = account.type.toLowerCase();
    if (lowered.includes('program') || lowered.includes('contract') || lowered.includes('executable')) {
      return false;
    }
  }

  return true;
}

async function loadTokenListMap() {
  if (!tokenListPromise) {
    tokenListPromise = axios.get(TOKEN_LIST_URL, { timeout: 10000 }).then((res) => {
      const tokens = res.data?.tokens || [];
      const map = new Map();
      for (const token of tokens) {
        if (token?.address) {
          map.set(token.address, token);
        }
      }
      return map;
    }).catch((err) => {
      console.error('Failed to load Solana token list:', err.message);
      return new Map();
    });
  }
  return tokenListPromise;
}

async function fetchSolscanTokenMeta(mint) {
  if (!config.SOLSCAN_API_KEY) {
    return null;
  }

  if (solscanMetaFailures > 3) {
    return null;
  }

  try {
    const headers = {
      'Authorization': `Bearer ${config.SOLSCAN_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.get(`https://api.solscan.io/token/meta?address=${mint}`, { headers, timeout: 10000 });
    if (response.data) {
      const meta = response.data;
      return {
        symbol: meta.symbol || null,
        name: meta.name || null,
        decimals: meta.decimals
      };
    }
  } catch (error) {
    solscanMetaFailures += 1;
    console.warn(`Solscan token meta fetch failed for ${mint}:`, error.response?.status || error.message);
  }

  return null;
}

async function getTokenMetadata(mint) {
  if (!mint) {
    return null;
  }

  if (tokenMetadataCache.has(mint)) {
    return tokenMetadataCache.get(mint);
  }

  let metadata = await fetchSolscanTokenMeta(mint);

  if (!metadata) {
    const tokenMap = await loadTokenListMap();
    const tokenInfo = tokenMap.get(mint);
    if (tokenInfo) {
      metadata = {
        symbol: tokenInfo.symbol || null,
        name: tokenInfo.name || null,
        decimals: tokenInfo.decimals
      };
    }
  }

  if (!metadata) {
    metadata = {
      symbol: null,
      name: null
    };
  }

  tokenMetadataCache.set(mint, metadata);
  return metadata;
}

async function getWalletInfo(address) {
  try {
    const headers = {
      'Authorization': `Bearer ${config.SOLSCAN_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const [accountResponse, txResponse] = await Promise.all([
      axios.get(`https://api.solscan.io/account?address=${address}`, { headers }),
      axios.get(`https://api.solscan.io/account/transactions?address=${address}&limit=1000`, { headers })
    ]);

    const result = {
      account: accountResponse.data,
      transactions: txResponse.data,
      source: 'solscan'
    };
    if (Array.isArray(result.account?.tokens)) {
      for (const token of result.account.tokens) {
        if (token?.mintAddress) {
          const meta = await getTokenMetadata(token.mintAddress);
          if (meta) {
            token.tokenSymbol = meta.symbol || token.tokenSymbol;
            token.tokenName = meta.name || token.tokenName;
          }
        }
      }
    }
    return result;
  } catch (error) {
    console.log('Solscan API unavailable, falling back to RPC...');
    return await getWalletInfoFallback(address);
  }
}

async function getWalletInfoFallback(address) {
  const rpcUrl = 'https://api.mainnet-beta.solana.com';

  const accountInfoResponse = await axios.post(rpcUrl, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getAccountInfo',
    params: [address, { encoding: 'base64' }]
  });

  const accountInfo = accountInfoResponse.data.result?.value;

  if (!accountInfo) {
    throw new Error('Account not found');
  }

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

  const signaturesResponse = await axios.post(rpcUrl, {
    jsonrpc: '2.0',
    id: 2,
    method: 'getSignaturesForAddress',
    params: [address, { limit: 1000 }]
  });

  const signatures = signaturesResponse.data.result || [];

  const tokens = tokenAccounts.map(account => {
    const parsed = account.account.data.parsed.info;
    return {
      tokenAmount: {
        uiAmount: parsed.tokenAmount?.uiAmount || 0,
        amount: parsed.tokenAmount?.amount || '0',
        decimals: parsed.tokenAmount?.decimals
      },
      mint: parsed.mint
    };
  });

  for (const token of tokens) {
    const meta = await getTokenMetadata(token.mint);
    if (meta) {
      token.tokenSymbol = meta.symbol;
      token.tokenName = meta.name;
    }
    if (!token.tokenSymbol) {
      token.tokenSymbol = (token.mint || '').slice(0, 5) + '...';
    }
    if (!token.tokenName) {
      token.tokenName = token.mint || 'Unknown Token';
    }
  }

  return {
    account: {
      lamports: accountInfo.lamports || 0,
      executable: accountInfo.executable || false,
      owner: accountInfo.owner,
      tokens,
      transactionCount: signatures.length,
      type: accountInfo.executable ? 'Program' : 'Account'
    },
    transactions: signatures,
    source: 'rpc'
  };
}

async function verifyAddress(address) {
  try {
    const info = await getWalletInfo(address);
    const isWallet = isWalletAccount(info.account);
    console.log(`Address: ${address}`);
    console.log(`  Source: ${info.source}`);
    console.log(`  Executable: ${info.account?.executable}`);
    console.log(`  Detected as wallet: ${isWallet}`);
    console.log(`  Transaction count: ${info.account?.transactionCount ?? info.transactions?.length ?? 0}`);
    const tokenList = Array.isArray(info.tokens) ? info.tokens : Array.isArray(info.account?.tokens) ? info.account.tokens : [];
    if (tokenList.length > 0) {
      console.log('  Tokens:');
      tokenList.slice(0, 5).forEach((token) => {
        const symbol = token.tokenSymbol || token.symbol || 'Unknown';
        const name = token.tokenName || token.name || token.mint || 'Unknown Token';
        const balance = token.tokenAmount?.uiAmount ?? token.uiAmount ?? 0;
        console.log(`    - ${symbol} (${name}): ${balance}`);
      });
      if (tokenList.length > 5) {
        console.log(`    ...and ${tokenList.length - 5} more`);
      }
    }
    console.log('');
  } catch (error) {
    console.error(`Failed to verify address ${address}:`, error.message);
  }
}

(async () => {
  const addresses = process.argv.slice(2);
  if (addresses.length === 0) {
    console.log('Usage: node verify-addresses.js <address1> <address2> ...');
    process.exit(0);
  }

  for (const addr of addresses) {
    await verifyAddress(addr);
  }
})();
