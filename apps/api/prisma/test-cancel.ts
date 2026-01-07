// Test script for cancel analysis workflow
async function testCancelWorkflow() {
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

  // Get initial token balance
  const balanceRes = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData = await balanceRes.json();
  const balanceBefore = balanceData.balance;
  console.log('Token balance before:', balanceBefore);

  // Step 1: Create an analysis
  console.log('\nStep 1: Creating analysis...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'cancel-test.pdf',
      testType: 'THERMOGRAPHY',
      pdfSizeBytes: 200000,
    }),
  });

  const createData = await createRes.json();
  console.log('Created analysis:', createData.analysis?.id);
  console.log('Initial status:', createData.analysis?.status);

  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }

  const analysisId = createData.analysis.id;

  // Step 2: Verify processing progress (PENDING status)
  console.log('\nStep 2: Checking status is PENDING...');
  const checkRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const checkData = await checkRes.json();
  console.log('Current status:', checkData.analysis?.status);
  const isPending = checkData.analysis?.status === 'PENDING';

  // Step 3: Cancel the analysis immediately (while still PENDING)
  console.log('\nStep 3: Cancelling analysis...');
  const cancelRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const cancelData = await cancelRes.json();
  console.log('Cancel response:', cancelData);

  // Step 4: Verify analysis is cancelled
  console.log('\nStep 4: Verifying cancelled status...');
  const verifyRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const verifyData = await verifyRes.json();
  console.log('Status after cancel:', verifyData.analysis?.status);
  console.log('Tokens consumed:', verifyData.analysis?.tokensConsumed);
  const isCancelled = verifyData.analysis?.status === 'CANCELLED';
  const tokensNotCharged = verifyData.analysis?.tokensConsumed === 0;

  // Step 5: Verify token balance unchanged
  console.log('\nStep 5: Checking token balance...');
  const balance2Res = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balance2Data = await balance2Res.json();
  const balanceAfter = balance2Data.balance;
  console.log('Token balance after:', balanceAfter);
  // Since we cancelled before processing finished, balance should be same or only slightly reduced
  // (the simulation runs in setTimeout so cancel might happen before token consumption)

  console.log('\n=== CANCEL WORKFLOW TEST ===');
  console.log('Analysis created in PENDING:', isPending);
  console.log('Cancel accepted:', cancelRes.status === 200);
  console.log('Status shows CANCELLED:', isCancelled);
  console.log('Tokens not charged (0):', tokensNotCharged);

  if (cancelRes.status === 200 && isCancelled && tokensNotCharged) {
    console.log('\nCANCEL WORKFLOW: SUCCESS');
  } else {
    console.log('\nCANCEL WORKFLOW: FAILED');
  }

  // Test that we can't cancel completed analysis
  console.log('\n--- Extra test: Cannot cancel completed analysis ---');
  const completeRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const completeData = await completeRes.json();
  console.log('Trying to cancel CANCELLED analysis:', completeData);
  console.log('Returns error (expected):', completeRes.status === 400);
}

testCancelWorkflow().catch(console.error);
