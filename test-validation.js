// Test server-side validation matches client-side
const API_URL = 'http://localhost:3005';

async function test() {
  // Login first
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@testcompany.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in successfully');

  // Test 1: Invalid email in invite
  console.log('\n--- Test 1: Invalid email in invite form ---');
  const invalidEmailRes = await fetch(`${API_URL}/api/users/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email: 'not-an-email', role: 'ANALYST' }),
  });
  const invalidEmailData = await invalidEmailRes.json();
  console.log(`Status: ${invalidEmailRes.status}`);
  console.log(`Response: ${JSON.stringify(invalidEmailData)}`);
  console.log(`Test 1 PASS: ${invalidEmailRes.status === 400 && invalidEmailData.message.includes('Invalid email')}`);

  // Test 2: Valid email in invite
  console.log('\n--- Test 2: Valid email in invite form ---');
  const validEmailRes = await fetch(`${API_URL}/api/users/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email: 'validtest@example.com', role: 'ANALYST' }),
  });
  const validEmailData = await validEmailRes.json();
  console.log(`Status: ${validEmailRes.status}`);
  console.log(`Response: ${JSON.stringify(validEmailData)}`);
  console.log(`Test 2 PASS: ${validEmailRes.status === 200 && validEmailData.success === true}`);

  // Test 3: Invalid password in login (too short) - but login only checks if password is required, not length
  console.log('\n--- Test 3: Invalid login with invalid email ---');
  const invalidLoginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid', password: 'test123' }),
  });
  const invalidLoginData = await invalidLoginRes.json();
  console.log(`Status: ${invalidLoginRes.status}`);
  console.log(`Response: ${JSON.stringify(invalidLoginData)}`);
  console.log(`Test 3 PASS: ${invalidLoginRes.status === 400 && invalidLoginData.message.includes('Invalid email')}`);

  // Test 4: Missing password in login
  console.log('\n--- Test 4: Missing password in login ---');
  const missingPwRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com' }),
  });
  const missingPwData = await missingPwRes.json();
  console.log(`Status: ${missingPwRes.status}`);
  console.log(`Response: ${JSON.stringify(missingPwData)}`);
  console.log(`Test 4 PASS: ${missingPwRes.status === 400}`);

  // Test 5: Accept invitation with short password
  console.log('\n--- Test 5: Accept invitation with short password ---');
  const shortPwRes = await fetch(`${API_URL}/api/auth/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake-token', name: 'Test User', password: 'short' }),
  });
  const shortPwData = await shortPwRes.json();
  console.log(`Status: ${shortPwRes.status}`);
  console.log(`Response: ${JSON.stringify(shortPwData)}`);
  console.log(`Test 5 PASS: ${shortPwRes.status === 400 && shortPwData.message.includes('8 characters')}`);

  // Test 6: Accept invitation with valid password
  console.log('\n--- Test 6: Accept invitation with valid password (but fake token) ---');
  const validPwRes = await fetch(`${API_URL}/api/auth/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake-token', name: 'Test User', password: 'validpassword123' }),
  });
  const validPwData = await validPwRes.json();
  console.log(`Status: ${validPwRes.status}`);
  console.log(`Response: ${JSON.stringify(validPwData)}`);
  // Should fail due to invalid token, not password validation
  console.log(`Test 6 PASS: ${validPwRes.status === 400 && !validPwData.message.includes('8 characters')}`);

  console.log('\n=== All tests completed ===');
}

test().catch(console.error);
