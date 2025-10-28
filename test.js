// Simple test script to verify wallet address validation
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(address) {
  return SOLANA_ADDRESS_REGEX.test(address);
}

// Test cases
const testAddresses = [
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Valid
  'invalid_address', // Invalid
  '11111111111111111111111111111112', // Valid (system program)
  'short', // Invalid
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM123', // Invalid (too long)
];

console.log('Testing wallet address validation:');
testAddresses.forEach((address, index) => {
  const isValid = isValidSolanaAddress(address);
  console.log(`${index + 1}. ${address}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

console.log('\nBot is ready to use! Send a wallet address to test the full functionality.');
