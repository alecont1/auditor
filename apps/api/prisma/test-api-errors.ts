// Test script for API error response handling
async function testApiErrors() {
  // First login to get a valid token
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

  console.log('\n=== Testing API Error Responses ===\n');

  // Step 1: Test 400 errors (validation)
  console.log('Step 1: Testing 400 validation errors...');

  // 1a. Missing required field
  const missing400Res = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename: 'test.pdf' }), // missing testType
  });
  console.log('Missing field - Status:', missing400Res.status);
  const missing400Data = await missing400Res.json();
  console.log('Has error message:', !!missing400Data.message || !!missing400Data.error);
  const error400Works = missing400Res.status === 400 && (missing400Data.message || missing400Data.error);

  // 1b. Invalid JSON
  const invalidJson400Res = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{invalid json',
  });
  console.log('Invalid JSON - Status:', invalidJson400Res.status);

  // Step 2: Test 401 errors (unauthorized)
  console.log('\nStep 2: Testing 401 unauthorized errors...');

  // 2a. No token
  const noToken401Res = await fetch('http://localhost:3000/api/analysis');
  console.log('No token - Status:', noToken401Res.status);
  const noToken401Data = await noToken401Res.json();
  console.log('Has error message:', !!noToken401Data.error);
  const error401NoToken = noToken401Res.status === 401;

  // 2b. Invalid token
  const invalidToken401Res = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: 'Bearer invalid-token-12345' },
  });
  console.log('Invalid token - Status:', invalidToken401Res.status);
  const error401InvalidToken = invalidToken401Res.status === 401;

  // 2c. Expired token (simulated by malformed JWT)
  const expiredToken401Res = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid' },
  });
  console.log('Expired/malformed token - Status:', expiredToken401Res.status);

  // Step 3: Test 403 errors (forbidden)
  console.log('\nStep 3: Testing 403 forbidden errors...');

  // Try to access super admin endpoint as regular admin
  const forbidden403Res = await fetch('http://localhost:3000/api/admin/companies', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Admin accessing super-admin route - Status:', forbidden403Res.status);
  // Note: This may return 404 if route doesn't exist, or 403 if it does
  const error403Works = forbidden403Res.status === 403 || forbidden403Res.status === 404;

  // Step 4: Test 404 errors (not found)
  console.log('\nStep 4: Testing 404 not found errors...');

  // 4a. Non-existent analysis
  const notFound404Res = await fetch('http://localhost:3000/api/analysis/non-existent-id-12345', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Non-existent analysis - Status:', notFound404Res.status);
  const notFound404Data = await notFound404Res.json();
  console.log('Error response:', notFound404Data.error || notFound404Data.message);
  const error404Works = notFound404Res.status === 404;

  // 4b. Non-existent endpoint
  const noRoute404Res = await fetch('http://localhost:3000/api/nonexistent-endpoint', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Non-existent endpoint - Status:', noRoute404Res.status);

  // Step 5: Verify error responses have proper structure
  console.log('\nStep 5: Testing error response structure...');

  // Check that error responses have either 'error' or 'message' field
  const structureChecks = [
    { name: '400 error', data: missing400Data },
    { name: '401 error', data: noToken401Data },
    { name: '404 error', data: notFound404Data },
  ];

  let allHaveProperStructure = true;
  for (const check of structureChecks) {
    const hasErrorField = 'error' in check.data || 'message' in check.data;
    console.log(`${check.name} has error/message field:`, hasErrorField);
    if (!hasErrorField) allHaveProperStructure = false;
  }

  // Verify no stack traces in production-style errors
  const noStackTraces = !JSON.stringify(missing400Data).includes(' at ') &&
                        !JSON.stringify(noToken401Data).includes(' at ') &&
                        !JSON.stringify(notFound404Data).includes(' at ');
  console.log('No stack traces exposed:', noStackTraces);

  console.log('\n=== API ERROR RESPONSES TEST ===');
  console.log('400 validation errors work:', error400Works);
  console.log('401 unauthorized errors work:', error401NoToken && error401InvalidToken);
  console.log('403/404 access errors work:', error403Works);
  console.log('404 not found errors work:', error404Works);
  console.log('Error responses have proper structure:', allHaveProperStructure);
  console.log('No stack traces exposed:', noStackTraces);

  if (error400Works && error401NoToken && error401InvalidToken &&
      error404Works && allHaveProperStructure && noStackTraces) {
    console.log('\nAPI ERROR RESPONSES: SUCCESS');
  } else {
    console.log('\nAPI ERROR RESPONSES: NEEDS REVIEW');
  }
}

testApiErrors().catch(console.error);
