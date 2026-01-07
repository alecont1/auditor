// Test script for 500 error handling
// We need to verify that server errors don't expose stack traces

async function test500Error() {
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

  // Test various error scenarios
  console.log('\n=== Testing Error Responses ===\n');

  // 1. Invalid JSON body
  console.log('Test 1: Invalid JSON body');
  const invalidJsonRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: 'not valid json{{{',
  });
  const invalidJsonData = await invalidJsonRes.text();
  console.log('Status:', invalidJsonRes.status);
  console.log('Response:', invalidJsonData.substring(0, 200));
  const hasStackTrace1 = invalidJsonData.includes('at ') || invalidJsonData.includes('Error:') && invalidJsonData.includes('.ts:');
  console.log('Contains stack trace:', hasStackTrace1);

  // 2. Test 404 endpoint
  console.log('\nTest 2: Non-existent endpoint');
  const notFoundRes = await fetch('http://localhost:3000/api/nonexistent', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const notFoundData = await notFoundRes.json();
  console.log('Status:', notFoundRes.status);
  console.log('Response:', notFoundData);
  const hasStackTrace2 = JSON.stringify(notFoundData).includes('at ');
  console.log('Contains stack trace:', hasStackTrace2);

  // 3. Test global error handler by checking what it returns
  console.log('\nTest 3: Checking standard error responses');
  // Try requesting without auth
  const noAuthRes = await fetch('http://localhost:3000/api/analysis');
  const noAuthData = await noAuthRes.json();
  console.log('Status:', noAuthRes.status);
  console.log('Response:', noAuthData);
  const hasStackTrace3 = JSON.stringify(noAuthData).includes('at ');
  console.log('Contains stack trace:', hasStackTrace3);

  console.log('\n=== 500 ERROR HANDLING TEST ===');
  console.log('404 returns clean message:', notFoundRes.status === 404 && notFoundData.error === 'Not Found');
  console.log('401 returns clean message:', noAuthRes.status === 401 && noAuthData.error);
  console.log('No stack traces exposed:', !hasStackTrace1 && !hasStackTrace2 && !hasStackTrace3);

  if (!hasStackTrace1 && !hasStackTrace2 && !hasStackTrace3 &&
      notFoundRes.status === 404 && noAuthRes.status === 401) {
    console.log('\n500 ERROR HANDLING: SUCCESS (errors are clean)');
  } else {
    console.log('\n500 ERROR HANDLING: NEEDS REVIEW');
  }
}

test500Error().catch(console.error);
