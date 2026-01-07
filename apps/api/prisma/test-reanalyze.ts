// Test script for reanalyze workflow
async function testReanalyzeWorkflow() {
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
      filename: 'reanalyze-test.pdf',
      testType: 'MEGGER',
      pdfSizeBytes: 500000,
    }),
  });

  const createData = await createRes.json();
  console.log('Created analysis:', createData.analysis?.id);

  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }

  const analysisId = createData.analysis.id;

  // Wait for initial processing
  console.log('Waiting for initial processing...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 2: Get initial results
  console.log('\nStep 2: Get initial analysis results...');
  const getRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getData = await getRes.json();
  console.log('Initial status:', getData.analysis?.status);
  console.log('Initial verdict:', getData.analysis?.verdict);
  console.log('Initial tokens:', getData.analysis?.tokensConsumed);

  // Get initial token balance
  const balanceRes = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData = await balanceRes.json();
  const balanceBefore = balanceData.balance;
  console.log('\nToken balance before reanalyze:', balanceBefore);

  // Step 3: Trigger re-analyze
  console.log('\nStep 3: Triggering re-analyze...');
  const reanalyzeRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/reanalyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const reanalyzeData = await reanalyzeRes.json();
  console.log('Re-analyze response:', reanalyzeData);
  console.log('Estimated tokens:', reanalyzeData.estimatedTokens);

  // Step 4: Verify processing starts
  console.log('\nStep 4: Verify processing started...');
  const checkRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const checkData = await checkRes.json();
  console.log('Status after reanalyze trigger:', checkData.analysis?.status);
  const processingStarted = checkData.analysis?.status === 'PENDING';
  console.log('Processing started:', processingStarted);

  // Step 5: Wait for completion
  console.log('\nStep 5: Waiting for reprocessing...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 6: Verify new results
  console.log('\nStep 6: Verify new results...');
  const finalRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const finalData = await finalRes.json();
  console.log('Final status:', finalData.analysis?.status);
  console.log('Final verdict:', finalData.analysis?.verdict);
  console.log('Final tokens:', finalData.analysis?.tokensConsumed);
  const newResultsDisplayed = finalData.analysis?.status === 'COMPLETED' && finalData.analysis?.verdict;

  // Step 7: Verify token consumption recorded
  console.log('\nStep 7: Verify token consumption...');
  const balance2Res = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balance2Data = await balance2Res.json();
  const balanceAfter = balance2Data.balance;
  console.log('Token balance after reanalyze:', balanceAfter);
  const tokensConsumed = balanceBefore - balanceAfter;
  console.log('Tokens consumed this session:', tokensConsumed);

  console.log('\n=== REANALYZE WORKFLOW TEST ===');
  console.log('Analysis created:', !!createData.analysis);
  console.log('Reanalyze accepted:', reanalyzeRes.status === 200);
  console.log('Token estimate shown:', !!reanalyzeData.estimatedTokens);
  console.log('Processing started:', processingStarted);
  console.log('New results displayed:', !!newResultsDisplayed);
  console.log('Token consumption recorded:', tokensConsumed > 0);

  if (reanalyzeRes.status === 200 && processingStarted && newResultsDisplayed && tokensConsumed > 0) {
    console.log('\nREANALYZE WORKFLOW: SUCCESS');
  } else {
    console.log('\nREANALYZE WORKFLOW: FAILED');
  }
}

testReanalyzeWorkflow().catch(console.error);
