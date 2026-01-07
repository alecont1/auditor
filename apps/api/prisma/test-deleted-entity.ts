// Test script to verify deep link to deleted entity is handled gracefully
async function testDeletedEntity() {
  console.log('=== Deleted Entity Deep Link Test ===\n');

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
      filename: 'deleted-entity-test.pdf',
      testType: 'GROUNDING',
      pdfSizeBytes: 2000,
    }),
  });

  const createData = await createRes.json();
  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }
  const analysisId = createData.analysis.id;
  console.log('✓ Created analysis with ID:', analysisId);

  // Step 2: Verify we can access it
  console.log('\nStep 2: Verifying access to analysis...');
  const accessRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Access before delete:', accessRes.status, accessRes.status === 200 ? '✓' : '✗');

  // Step 3: Delete the analysis
  console.log('\nStep 3: Deleting the analysis...');
  const deleteRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  console.log('  Delete result:', deleteRes.status, deleteData.message);

  // Step 4: Try to access the deleted analysis (deep link)
  console.log('\nStep 4: Trying to access deleted analysis...');
  const deepLinkRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const deepLinkData = await deepLinkRes.json();

  console.log('  Status:', deepLinkRes.status);
  console.log('  Response:', JSON.stringify(deepLinkData, null, 2));

  const returns404 = deepLinkRes.status === 404;
  const hasNotFoundMessage = deepLinkData.message?.toLowerCase().includes('not found');

  console.log('\n=== Results ===');
  console.log('Returns 404:', returns404 ? '✓ PASS' : '✗ FAIL');
  console.log('Has "not found" message:', hasNotFoundMessage ? '✓ PASS' : '✗ FAIL');

  // Step 5: Try other operations on deleted entity
  console.log('\nStep 5: Testing other operations on deleted entity...');

  // Try to export
  const exportRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Export attempt:', exportRes.status, exportRes.status === 404 ? '✓' : '✗');

  // Try to reanalyze
  const reanalyzeRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/reanalyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Reanalyze attempt:', reanalyzeRes.status, reanalyzeRes.status === 404 ? '✓' : '✗');

  // Try to cancel
  const cancelRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Cancel attempt:', cancelRes.status, cancelRes.status === 404 ? '✓' : '✗');

  // Try to delete again
  const deleteAgainRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Delete again attempt:', deleteAgainRes.status, deleteAgainRes.status === 404 ? '✓' : '✗');

  const allOperationsReturn404 =
    exportRes.status === 404 &&
    reanalyzeRes.status === 404 &&
    cancelRes.status === 404 &&
    deleteAgainRes.status === 404;

  console.log('\n=== DELETED ENTITY TEST ===');
  console.log('Deep link returns 404 with message:', returns404 && hasNotFoundMessage ? '✓ PASS' : '✗ FAIL');
  console.log('All operations return 404:', allOperationsReturn404 ? '✓ PASS' : '✗ FAIL');

  if (returns404 && hasNotFoundMessage && allOperationsReturn404) {
    console.log('\nRESULT: ✓ PASS - Deleted entity handled gracefully');
  } else {
    console.log('\nRESULT: ✗ FAIL - Issues with deleted entity handling');
    process.exit(1);
  }
}

testDeletedEntity().catch(console.error);
