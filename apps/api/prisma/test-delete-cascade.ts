// Test script to verify deleted analysis is removed from all views
async function testDeleteCascade() {
  console.log('=== Delete Analysis Cascade Test ===\n');

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

  // Step 1: Create an analysis
  console.log('\nStep 1: Creating an analysis...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'cascade-delete-test.pdf',
      testType: 'THERMOGRAPHY',
      pdfSizeBytes: 4000,
    }),
  });

  const createData = await createRes.json();
  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }
  const analysisId = createData.analysis.id;
  console.log('✓ Created analysis:', analysisId);

  // Wait a bit for processing
  await new Promise((r) => setTimeout(r, 2000));

  // Step 2: Verify it appears in all views
  console.log('\nStep 2: Verifying analysis appears in all views...');

  // Check History (list all analyses)
  const historyRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyData = await historyRes.json();
  const inHistory = historyData.analyses.some((a: any) => a.id === analysisId);
  console.log('  In History list:', inHistory ? '✓' : '✗');

  // Check Dashboard recent
  const recentRes = await fetch('http://localhost:3000/api/analysis/recent', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const recentData = await recentRes.json();
  const inRecent = recentData.analyses.some((a: any) => a.id === analysisId);
  console.log('  In Recent list:', inRecent ? '✓' : '✗');

  // Check direct access
  const detailRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detailOk = detailRes.status === 200;
  console.log('  Direct access:', detailOk ? '✓' : '✗');

  // Step 3: Delete the analysis
  console.log('\nStep 3: Deleting the analysis...');
  const deleteRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Delete status:', deleteRes.status);

  // Step 4: Verify removed from all views
  console.log('\nStep 4: Verifying analysis removed from all views...');

  // Check History (list all analyses)
  const historyRes2 = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyData2 = await historyRes2.json();
  const notInHistory = !historyData2.analyses.some((a: any) => a.id === analysisId);
  console.log('  Removed from History list:', notInHistory ? '✓' : '✗');

  // Check Dashboard recent
  const recentRes2 = await fetch('http://localhost:3000/api/analysis/recent', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const recentData2 = await recentRes2.json();
  const notInRecent = !recentData2.analyses.some((a: any) => a.id === analysisId);
  console.log('  Removed from Recent list:', notInRecent ? '✓' : '✗');

  // Check direct access
  const detailRes2 = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detailGone = detailRes2.status === 404;
  console.log('  Direct access returns 404:', detailGone ? '✓' : '✗');

  // Step 5: Check stats endpoint still works
  console.log('\nStep 5: Verifying stats endpoint still works...');
  const statsRes = await fetch('http://localhost:3000/api/analysis/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statsOk = statsRes.status === 200;
  console.log('  Stats endpoint works:', statsOk ? '✓' : '✗');

  console.log('\n=== DELETE CASCADE TEST ===');
  const allPassed = inHistory && detailOk && notInHistory && notInRecent && detailGone && statsOk;
  console.log('Analysis removed from all views:', allPassed ? '✓ PASS' : '✗ FAIL');

  if (allPassed) {
    console.log('\nRESULT: ✓ PASS - Delete properly removes from all views');
  } else {
    console.log('\nRESULT: ✗ FAIL - Delete did not cascade properly');
    process.exit(1);
  }
}

testDeleteCascade().catch(console.error);
