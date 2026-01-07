// Test script for insufficient tokens error handling
async function testInsufficientTokens() {
  // First login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@testcompany.com', password: 'admin123' }),
  });

  const loginData = await loginRes.json();
  console.log('Login:', loginData.user?.email || 'failed');

  if (!loginData.token) {
    console.error('Login failed');
    process.exit(1);
  }

  const token = loginData.token;

  // Get current token balance
  const balanceRes = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData = await balanceRes.json();
  console.log('Current token balance:', balanceData.balance);

  // Try to create an analysis with a file size that requires more tokens than available
  // If balance is high, we'll use a huge file size to trigger insufficient tokens
  const hugeFileSize = (balanceData.balance + 1000) * 100; // Ensure we exceed balance

  console.log('\nTrying to create analysis requiring ~', Math.round(hugeFileSize / 100), 'tokens');

  const analysisRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'huge-test.pdf',
      testType: 'MEGGER',
      pdfSizeBytes: hugeFileSize,
    }),
  });

  const analysisData = await analysisRes.json();
  console.log('\nResponse status:', analysisRes.status);
  console.log('Response body:', analysisData);

  console.log('\n=== INSUFFICIENT TOKENS ERROR TEST ===');
  console.log('Returns 402 status:', analysisRes.status === 402);
  console.log('Has meaningful error message:', analysisData.message?.includes('token') || analysisData.error?.includes('Token'));
  console.log('Message mentions required/available:', analysisData.message?.includes('Required') && analysisData.message?.includes('Available'));

  if (analysisRes.status === 402 && analysisData.message?.includes('token')) {
    console.log('\nINSUFFICIENT TOKENS ERROR HANDLING: SUCCESS');
  } else {
    console.log('\nINSUFFICIENT TOKENS ERROR HANDLING: FAILED (may need lower token balance to test)');
  }
}

testInsufficientTokens().catch(console.error);
