// Test script for 404 analysis not found handling
async function test404Analysis() {
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

  // Try to get a non-existent analysis
  console.log('\nRequesting non-existent analysis...');
  const analysisRes = await fetch('http://localhost:3000/api/analysis/non-existent-uuid-12345', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const analysisData = await analysisRes.json();
  console.log('Response status:', analysisRes.status);
  console.log('Response body:', analysisData);

  console.log('\n=== 404 ANALYSIS NOT FOUND TEST ===');
  console.log('Returns 404 status:', analysisRes.status === 404);
  console.log('Has "Not Found" error:', analysisData.error === 'Not Found');
  console.log('Has "Analysis not found" message:', analysisData.message === 'Analysis not found');

  if (analysisRes.status === 404 && analysisData.message === 'Analysis not found') {
    console.log('\n404 ANALYSIS NOT FOUND HANDLING: SUCCESS');
  } else {
    console.log('\n404 ANALYSIS NOT FOUND HANDLING: FAILED');
  }
}

test404Analysis().catch(console.error);
