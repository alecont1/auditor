// Test script to verify company deletion cascades correctly
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompanyDelete() {
  console.log('=== Company Delete Cascade Test ===\n');

  // Create/update a SUPER_ADMIN user with known password
  const { hashPassword } = await import('../src/lib/password');
  const hashedPassword = await hashPassword('superadmin123');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin-test@auditeng.com' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'superadmin-test@auditeng.com',
      name: 'Super Admin Test',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      companyId: null,
    },
  });
  console.log('✓ SUPER_ADMIN user ready:', superAdmin.email);

  // Login as SUPER_ADMIN
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin-test@auditeng.com', password: 'superadmin123' }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('✓ Logged in as SUPER_ADMIN');

  // Step 1: Create a test company
  console.log('\nStep 1: Creating test company...');
  const createCompanyRes = await fetch('http://localhost:3000/api/companies', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Cascade Delete Test Company',
      tokenBalance: 5000,
    }),
  });

  const companyData = await createCompanyRes.json();
  if (!companyData.company) {
    console.error('Failed to create company:', companyData);
    process.exit(1);
  }
  const companyId = companyData.company.id;
  console.log('✓ Created company:', companyId);

  // Step 2: Create a user in the company
  console.log('\nStep 2: Creating user in company...');
  const userHashedPassword = await hashPassword('test123');
  const uniqueEmail = `cascade-test-${Date.now()}@testcompany.com`;
  const testUser = await prisma.user.create({
    data: {
      email: uniqueEmail,
      name: 'Cascade Test User',
      passwordHash: userHashedPassword,
      role: 'ANALYST',
      companyId: companyId,
    },
  });
  console.log('✓ Created user:', testUser.id);

  // Step 3: Create an analysis for the company (via user login)
  console.log('\nStep 3: Creating analysis for company...');
  const userLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'test123' }),
  });
  const userLoginData = await userLoginRes.json();
  const userToken = userLoginData.token;

  const analysisRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'cascade-test-analysis.pdf',
      testType: 'MEGGER',
      pdfSizeBytes: 3000,
    }),
  });
  const analysisData = await analysisRes.json();
  const analysisId = analysisData.analysis?.id;
  console.log('✓ Created analysis:', analysisId);

  // Step 4: Create a token transaction
  console.log('\nStep 4: Creating token transaction...');
  const tokenTx = await prisma.tokenTransaction.create({
    data: {
      company: { connect: { id: companyId } },
      user: { connect: { id: testUser.id } },
      type: 'PURCHASE',
      amount: 1000,
      balance: 6000, // After purchase
      description: 'Test purchase',
    },
  });
  console.log('✓ Created token transaction:', tokenTx.id);

  // Verify counts before delete
  console.log('\nBefore delete:');
  const usersBefore = await prisma.user.count({ where: { companyId } });
  const analysesBefore = await prisma.analysis.count({ where: { companyId } });
  const txBefore = await prisma.tokenTransaction.count({ where: { companyId } });
  console.log('  Users:', usersBefore);
  console.log('  Analyses:', analysesBefore);
  console.log('  Token transactions:', txBefore);

  // Step 5: Delete the company
  console.log('\nStep 5: Deleting company...');
  const deleteRes = await fetch(`http://localhost:3000/api/companies/${companyId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: 'superadmin123',
    }),
  });
  const deleteData = await deleteRes.json();
  console.log('  Delete status:', deleteRes.status);
  console.log('  Delete response:', deleteData.message || deleteData);

  // Step 6: Verify cascade
  console.log('\nStep 6: Verifying cascade delete...');
  const usersAfter = await prisma.user.count({ where: { companyId } });
  const analysesAfter = await prisma.analysis.count({ where: { companyId } });
  const txAfter = await prisma.tokenTransaction.count({ where: { companyId } });
  const companyExists = await prisma.company.findUnique({ where: { id: companyId } });

  console.log('After delete:');
  console.log('  Company exists:', companyExists ? '✗ YES' : '✓ NO');
  console.log('  Users:', usersAfter, usersAfter === 0 ? '✓' : '✗');
  console.log('  Analyses:', analysesAfter, analysesAfter === 0 ? '✓' : '✗');
  console.log('  Token transactions:', txAfter, txAfter === 0 ? '✓' : '✗');

  await prisma.$disconnect();

  console.log('\n=== COMPANY DELETE CASCADE TEST ===');
  const allDeleted = !companyExists && usersAfter === 0 && analysesAfter === 0 && txAfter === 0;
  console.log('Cascade delete successful:', allDeleted ? '✓ PASS' : '✗ FAIL');

  if (allDeleted) {
    console.log('\nRESULT: ✓ PASS - Company deletion cascades correctly');
  } else {
    console.log('\nRESULT: ✗ FAIL - Cascade delete did not work properly');
    process.exit(1);
  }
}

testCompanyDelete().catch(console.error);
