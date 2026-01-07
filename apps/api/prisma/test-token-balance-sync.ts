// Test script for token balance sync functionality
async function testTokenBalanceSync() {
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

  // Step 1: Get initial token balance
  console.log('\nStep 1: Getting initial token balance...');
  const balanceRes1 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData1 = await balanceRes1.json();
  const initialBalance = balanceData1.balance;
  console.log('Initial balance:', initialBalance);

  // Step 2: Create an analysis
  console.log('\nStep 2: Creating an analysis...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'token-sync-test.pdf',
      testType: 'MEGGER',
      pdfSizeBytes: 5000,
    }),
  });

  const createData = await createRes.json();
  if (!createData.analysis) {
    console.error('Failed to create analysis');
    process.exit(1);
  }

  const analysisId = createData.analysis.id;
  console.log('Created analysis:', analysisId);

  // Step 3: Wait for processing to complete
  console.log('\nStep 3: Waiting for processing...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Check if analysis is completed
  const analysisRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisData = await analysisRes.json();
  console.log('Analysis status:', analysisData.analysis?.status);
  console.log('Tokens consumed:', analysisData.analysis?.tokensConsumed);

  // Step 4: Verify balance updated after processing
  console.log('\nStep 4: Verifying balance updated...');
  const balanceRes2 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData2 = await balanceRes2.json();
  const afterProcessingBalance = balanceData2.balance;
  console.log('Balance after processing:', afterProcessingBalance);

  const tokensConsumed = analysisData.analysis?.tokensConsumed || 0;
  const expectedBalance = initialBalance - tokensConsumed;
  const balanceUpdatedCorrectly = afterProcessingBalance === expectedBalance;
  console.log('Expected balance:', expectedBalance);
  console.log('Balance updated correctly:', balanceUpdatedCorrectly);

  // Step 5: Refresh page simulation (re-fetch balance)
  console.log('\nStep 5: Simulating page refresh...');
  const balanceRes3 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData3 = await balanceRes3.json();
  const refreshedBalance = balanceData3.balance;
  console.log('Balance after refresh:', refreshedBalance);
  const balancePersisted = refreshedBalance === afterProcessingBalance;
  console.log('Balance persisted correctly:', balancePersisted);

  // Cleanup
  console.log('\n--- Cleanup ---');
  await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Deleted test analysis');

  console.log('\n=== TOKEN BALANCE SYNC TEST ===');
  console.log('Initial balance fetched:', initialBalance !== null);
  console.log('Analysis created and processed:', analysisData.analysis?.status === 'COMPLETED');
  console.log('Balance updated after processing:', balanceUpdatedCorrectly);
  console.log('Balance persists after refresh:', balancePersisted);

  if (initialBalance !== null && analysisData.analysis?.status === 'COMPLETED' &&
      balanceUpdatedCorrectly && balancePersisted) {
    console.log('\nTOKEN BALANCE SYNC: SUCCESS');
  } else {
    console.log('\nTOKEN BALANCE SYNC: NEEDS REVIEW');
  }
}

testTokenBalanceSync().catch(console.error);
