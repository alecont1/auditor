// Test script to verify URL ID manipulation is blocked (tenant isolation)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testURLIDManipulation() {
  console.log('=== URL ID Manipulation Test (Tenant Isolation) ===\n');

  // Login as User A (admin from testcompany)
  console.log('Step 1: Login as User A (admin@testcompany.com)...');
  const loginResA = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@testcompany.com', password: 'admin123' }),
  });

  const loginDataA = await loginResA.json();
  if (!loginDataA.token) {
    console.error('Login failed for User A');
    process.exit(1);
  }
  const tokenA = loginDataA.token;
  const userA = loginDataA.user;
  console.log('✓ User A logged in:', userA.email, '(Company:', userA.companyId, ')');

  // Create an analysis as User A
  console.log('\nStep 2: Creating analysis as User A...');
  const createRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'tenant-isolation-test.pdf',
      testType: 'GROUNDING',
      pdfSizeBytes: 5000,
    }),
  });

  const createData = await createRes.json();
  if (!createData.analysis) {
    console.error('Failed to create analysis:', createData);
    process.exit(1);
  }
  const analysisId = createData.analysis.id;
  console.log('✓ Created analysis:', analysisId);

  // Verify User A can access the analysis
  console.log('\nStep 3: Verify User A can access their own analysis...');
  const accessResA = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log('✓ User A access result:', accessResA.status, accessResA.status === 200 ? 'OK' : 'FAILED');

  // Create a test user in a different company
  console.log('\nStep 4: Setting up User B in a different company...');

  // Create a second company for testing
  const companyB = await prisma.company.upsert({
    where: { id: 'isolation-test-company' },
    update: {},
    create: {
      id: 'isolation-test-company',
      name: 'Isolation Test Company',
      tokenBalance: 10000,
    },
  });
  console.log('✓ Second company:', companyB.id);

  // Create user in second company
  const { hashPassword } = await import('../src/lib/password');
  const hashedPassword = await hashPassword('test123');
  const userB = await prisma.user.upsert({
    where: { email: 'user@isolationtest.com' },
    update: {},
    create: {
      email: 'user@isolationtest.com',
      name: 'User B',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      companyId: companyB.id,
    },
  });
  console.log('✓ User B:', userB.email);

  // Login as User B
  console.log('\nStep 5: Login as User B...');
  const loginResB = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@isolationtest.com', password: 'test123' }),
  });

  const loginDataB = await loginResB.json();
  if (!loginDataB.token) {
    console.error('Login failed for User B:', loginDataB);
    // Cleanup
    await prisma.analysis.delete({ where: { id: analysisId } });
    process.exit(1);
  }
  const tokenB = loginDataB.token;
  console.log('✓ User B logged in:', userB.email, '(Company:', companyB.id, ')');

  // Try to access User A's analysis as User B (URL ID manipulation)
  console.log('\nStep 6: User B tries to access User A\'s analysis (URL manipulation)...');
  console.log('   Attempting GET /api/analysis/' + analysisId);
  const accessResB = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const accessDataB = await accessResB.json();

  console.log('   Status:', accessResB.status);
  console.log('   Response:', JSON.stringify(accessDataB, null, 2));

  const blocked = accessResB.status === 404;
  const noDataLeakage = !accessDataB.analysis;

  console.log('\n=== Results ===');
  console.log('Access blocked (404):', blocked ? '✓ PASS' : '✗ FAIL');
  console.log('No data leakage:', noDataLeakage ? '✓ PASS' : '✗ FAIL');

  // Test other endpoints too
  console.log('\nStep 7: Testing other endpoints for same isolation...');

  // Export
  const exportRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/export`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('Export endpoint blocked:', exportRes.status === 404 ? '✓ PASS' : '✗ FAIL');

  // Reanalyze
  const reanalyzeRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/reanalyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('Reanalyze endpoint blocked:', reanalyzeRes.status === 404 ? '✓ PASS' : '✗ FAIL');

  // Cancel
  const cancelRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('Cancel endpoint blocked:', cancelRes.status === 404 ? '✓ PASS' : '✗ FAIL');

  // Delete
  const deleteRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}/delete`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('Delete endpoint blocked:', deleteRes.status === 404 ? '✓ PASS' : '✗ FAIL');

  // Cleanup
  console.log('\n--- Cleanup ---');
  await prisma.analysis.delete({ where: { id: analysisId } });
  console.log('Deleted test analysis');

  await prisma.$disconnect();

  console.log('\n=== URL ID MANIPULATION TEST ===');
  if (blocked && noDataLeakage) {
    console.log('RESULT: ✓ PASS - Tenant isolation working correctly');
  } else {
    console.log('RESULT: ✗ FAIL - Tenant isolation broken!');
    process.exit(1);
  }
}

testURLIDManipulation().catch(console.error);
