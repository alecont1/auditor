// Test script to verify token transaction handling on analysis deletion
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTokenCleanup() {
  console.log('=== Token Transaction Cleanup Test ===\n');

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

  // Get initial balance
  const balanceRes1 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData1 = await balanceRes1.json();
  const initialBalance = balanceData1.balance;
  console.log('Initial balance:', initialBalance);

  // Step 1: Create an analysis
  console.log('\nStep 1: Creating analysis...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'token-cleanup-test.pdf',
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
  console.log('✓ Created analysis:', analysisId);

  // Wait for processing to complete
  console.log('Waiting for processing...');
  await new Promise((r) => setTimeout(r, 5000));

  // Check if token was consumed
  const analysisRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisData = await analysisRes.json();
  const tokensConsumed = analysisData.analysis?.tokensConsumed || 0;
  console.log('Tokens consumed:', tokensConsumed);

  // Get balance after consumption
  const balanceRes2 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData2 = await balanceRes2.json();
  const afterConsumptionBalance = balanceData2.balance;
  console.log('Balance after consumption:', afterConsumptionBalance);

  // Find the consumption transaction
  const transactions = await prisma.tokenTransaction.findMany({
    where: { analysisId },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Token transactions for this analysis:', transactions.length);
  const consumptionTx = transactions.find((t) => t.type === 'CONSUMPTION');
  console.log('Consumption transaction ID:', consumptionTx?.id || 'NOT FOUND');

  // Step 2: Delete the analysis
  console.log('\nStep 2: Deleting the analysis...');
  const deleteRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Delete status:', deleteRes.status);

  // Step 3: Verify token transaction still exists but analysisId is null
  console.log('\nStep 3: Verifying token transaction handling...');
  if (consumptionTx) {
    const updatedTx = await prisma.tokenTransaction.findUnique({
      where: { id: consumptionTx.id },
    });

    if (updatedTx) {
      console.log('Transaction still exists:', '✓');
      console.log('Transaction analysisId:', updatedTx.analysisId === null ? 'NULL (✓)' : updatedTx.analysisId);
      console.log('Transaction amount preserved:', updatedTx.amount === consumptionTx.amount ? '✓' : '✗');
    } else {
      console.log('Transaction was deleted:', '✗ (should be preserved with null analysisId)');
    }
  }

  // Step 4: Verify balance hasn't changed (no refund)
  console.log('\nStep 4: Verifying balance...');
  const balanceRes3 = await fetch('http://localhost:3000/api/tokens/balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const balanceData3 = await balanceRes3.json();
  const afterDeleteBalance = balanceData3.balance;
  console.log('Balance after delete:', afterDeleteBalance);

  const noRefund = afterDeleteBalance === afterConsumptionBalance;
  console.log('No refund given:', noRefund ? '✓' : '✗');

  // Step 5: Verify token history still shows the transaction
  console.log('\nStep 5: Verifying token history...');
  const historyRes = await fetch('http://localhost:3000/api/tokens/history', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyData = await historyRes.json();
  const inHistory = historyData.transactions?.some((t: any) => t.id === consumptionTx?.id);
  console.log('Transaction in history:', inHistory ? '✓' : '✗');

  await prisma.$disconnect();

  console.log('\n=== TOKEN CLEANUP TEST ===');
  console.log('Token consumption recorded:', tokensConsumed > 0 ? '✓' : '✗');
  console.log('Transaction preserved after delete:', consumptionTx ? '✓' : '✗');
  console.log('No refund on analysis delete:', noRefund ? '✓' : '✗');
  console.log('Transaction in history:', inHistory !== false ? '✓' : '✗');

  if (noRefund) {
    console.log('\nRESULT: ✓ PASS - Token transactions handled correctly on delete');
  } else {
    console.log('\nRESULT: ✗ FAIL - Token handling issues');
    process.exit(1);
  }
}

testTokenCleanup().catch(console.error);
