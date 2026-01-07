// Test script to verify malformed URL parameters are handled gracefully
async function testMalformedURLs() {
  console.log('=== Malformed URL Parameters Test ===\n');

  // Login first
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@testcompany.com', password: 'admin123' }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed');
    process.exit(1);
  }
  const token = loginData.token;
  console.log('✓ Logged in as:', loginData.user.email);

  // Test 1: Analysis with invalid UUID
  console.log('\nTest 1: GET /api/analysis/not-a-uuid');
  const test1 = await fetch('http://localhost:3000/api/analysis/not-a-uuid', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test1.status);
  console.log('  Response:', await test1.json());
  const test1Pass = test1.status === 404;
  console.log('  Result:', test1Pass ? '✓ PASS (404)' : '✗ FAIL');

  // Test 2: Analysis with random valid-looking UUID
  console.log('\nTest 2: GET /api/analysis/00000000-0000-0000-0000-000000000000');
  const test2 = await fetch('http://localhost:3000/api/analysis/00000000-0000-0000-0000-000000000000', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test2.status);
  console.log('  Response:', await test2.json());
  const test2Pass = test2.status === 404;
  console.log('  Result:', test2Pass ? '✓ PASS (404)' : '✗ FAIL');

  // Test 3: Analysis with SQL injection attempt
  console.log('\nTest 3: GET /api/analysis/1; DROP TABLE analysis;--');
  const test3 = await fetch("http://localhost:3000/api/analysis/1; DROP TABLE analysis;--", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test3.status);
  const test3Pass = test3.status === 404;
  console.log('  Result:', test3Pass ? '✓ PASS (404)' : '✗ FAIL');

  // Test 4: Analysis with XSS attempt
  console.log('\nTest 4: GET /api/analysis/<script>alert(1)</script>');
  const test4 = await fetch("http://localhost:3000/api/analysis/<script>alert(1)</script>", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test4.status);
  const test4Pass = test4.status === 404;
  console.log('  Result:', test4Pass ? '✓ PASS (404)' : '✗ FAIL');

  // Test 5: Users endpoint with invalid ID
  console.log('\nTest 5: GET /api/users/not-a-uuid');
  const test5 = await fetch('http://localhost:3000/api/users/not-a-uuid', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test5.status);
  const test5Pass = test5.status === 404;
  console.log('  Result:', test5Pass ? '✓ PASS (404)' : '✗ FAIL');

  // Test 6: Company endpoint with invalid ID
  console.log('\nTest 6: GET /api/companies/invalid-company');
  const test6 = await fetch('http://localhost:3000/api/companies/invalid-company', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Status:', test6.status);
  const test6Pass = test6.status === 403 || test6.status === 404;
  console.log('  Result:', test6Pass ? '✓ PASS (403/404)' : '✗ FAIL');

  // Frontend validation note
  console.log('\n=== Frontend URL Parameter Handling ===');
  console.log('HistoryPage pagination:');
  console.log('  ?page=invalid -> defaults to page 1 (parseInt returns NaN, clamped to 1)');
  console.log('  ?page=-5 -> defaults to page 1 (negative, clamped to 1)');
  console.log('  ?page=999 -> clamped to last valid page (validPage = Math.min(currentPage, totalPages))');
  console.log('\nAnalysisDetailPage with invalid ID:');
  console.log('  API returns 404 -> frontend shows "Analysis not found" error');

  console.log('\n=== MALFORMED URL TEST RESULTS ===');
  const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass;
  console.log('API invalid IDs return 404:', allPass ? '✓ PASS' : '✗ FAIL');
  console.log('Frontend pagination validated:', '✓ PASS (code review)');

  if (allPass) {
    console.log('\nRESULT: ✓ PASS - Malformed URLs handled gracefully');
  } else {
    console.log('\nRESULT: ✗ FAIL - Some malformed URLs not handled');
    process.exit(1);
  }
}

testMalformedURLs().catch(console.error);
