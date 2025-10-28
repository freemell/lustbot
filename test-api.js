// Test script to verify Solscan API integration
const axios = require('axios');
const config = require('./config');

async function testSolscanAPI() {
  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  
  try {
    console.log('Testing Solscan API integration...');
    
    const headers = {
      'Authorization': `Bearer ${config.SOLSCAN_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    // Test account endpoint
    console.log('1. Testing account endpoint...');
    const accountResponse = await axios.get(`https://api.solscan.io/account?address=${testAddress}`, { headers });
    console.log('✅ Account data received:', accountResponse.data ? 'Yes' : 'No');
    
    // Test tokens endpoint
    console.log('2. Testing tokens endpoint...');
    const tokensResponse = await axios.get(`https://api.solscan.io/account/tokens?address=${testAddress}`, { headers });
    console.log('✅ Tokens data received:', tokensResponse.data ? 'Yes' : 'No');
    console.log('   Token count:', tokensResponse.data?.length || 0);
    
    // Test transactions endpoint
    console.log('3. Testing transactions endpoint...');
    const txResponse = await axios.get(`https://api.solscan.io/account/transactions?address=${testAddress}&limit=5`, { headers });
    console.log('✅ Transactions data received:', txResponse.data ? 'Yes' : 'No');
    console.log('   Transaction count:', txResponse.data?.length || 0);
    
    console.log('\n🎉 All API tests passed! Bot is ready to use.');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSolscanAPI();
