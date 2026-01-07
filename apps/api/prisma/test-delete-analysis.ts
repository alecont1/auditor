// Test script for analysis deletion workflow
async function testDeleteWorkflow() {
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

  // Step 1: Create an analysis
  console.log('\nStep 1: Creating analysis...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'test-delete.pdf',
      testType: 'GROUNDING',
      pdfSizeBytes: 1000,
    }),
  });

  const createData = await createRes.json();
  console.log('Created analysis:', createData.analysis?.id);

  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }

  const analysisId = createData.analysis.id;

  // Wait for processing
  console.log('Waiting for processing...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 2: Verify analysis exists
  console.log('\nStep 2: Verify analysis exists...');
  const getRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getData = await getRes.json();
  console.log('Analysis exists:', !!getData.analysis);

  // Step 3: Count analyses before delete
  const beforeRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const beforeData = await beforeRes.json();
  const beforeCount = beforeData.analyses.length;
  console.log('\nAnalyses before delete:', beforeCount);

  // Step 4: Delete the analysis
  console.log('\nStep 4: Deleting analysis...');
  const deleteRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  console.log('Delete response:', deleteData);

  // Step 5: Verify analysis is removed
  console.log('\nStep 5: Verify analysis removed...');
  const checkRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Analysis not found (404):', checkRes.status === 404);

  // Step 6: Count analyses after delete
  const afterRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterData = await afterRes.json();
  const afterCount = afterData.analyses.length;
  console.log('Analyses after delete:', afterCount);
  console.log('Analysis removed from list:', afterCount === beforeCount - 1);

  console.log('\n=== DELETION WORKFLOW TEST ===');
  console.log('Analysis created:', !!createData.analysis);
  console.log('Delete succeeded:', deleteRes.status === 200);
  console.log('Analysis returns 404:', checkRes.status === 404);
  console.log('Removed from list:', afterCount === beforeCount - 1);

  if (deleteRes.status === 200 && checkRes.status === 404 && afterCount === beforeCount - 1) {
    console.log('\nDELETION WORKFLOW: SUCCESS');
  } else {
    console.log('\nDELETION WORKFLOW: FAILED');
  }
}

testDeleteWorkflow().catch(console.error);
