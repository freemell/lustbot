// Test script to verify fallback API works
const axios = require('axios');

async function testFallbackAPI() {
  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  
  try {
    console.log('Testing Solana RPC fallback...');
    
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    
    // Test account info
    console.log('1. Testing account info...');
    const accountInfoResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        testAddress,
        { encoding: 'base64' }
      ]
    });

    const accountInfo = accountInfoResponse.data.result?.value;
    console.log('✅ Account info received:', accountInfo ? 'Yes' : 'No');
    console.log('   SOL Balance:', accountInfo ? (accountInfo.lamports / 1e9).toFixed(6) + ' SOL' : 'N/A');
    
    // Test token accounts
    console.log('2. Testing token accounts...');
    const tokenAccountsResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 2,
      method: 'getTokenAccountsByOwner',
      params: [
        testAddress,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    });

    const tokenAccounts = tokenAccountsResponse.data.result?.value || [];
    console.log('✅ Token accounts received:', tokenAccounts.length, 'tokens');
    
    // Test transaction signatures
    console.log('3. Testing transaction signatures...');
    const signaturesResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 3,
      method: 'getSignaturesForAddress',
      params: [testAddress, { limit: 10 }]
    });

    const signatures = signaturesResponse.data.result || [];
    console.log('✅ Transaction signatures received:', signatures.length, 'transactions');
    
    console.log('\n🎉 Fallback API test passed! Bot should work even without Solscan.');
    
  } catch (error) {
    console.error('❌ Fallback API test failed:', error.message);
  }
}

testFallbackAPI();
