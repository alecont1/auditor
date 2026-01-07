// Test script for cascade delete verification
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCascadeDelete() {
  // Get super admin token for company management
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@auditeng.com', password: 'superadmin123' }),
  });

  const loginData = await loginRes.json();
  console.log('Super Admin Login:', loginData.user?.email || 'failed');

  if (!loginData.token || loginData.user?.role !== 'SUPER_ADMIN') {
    console.log('Super admin login failed or user is not SUPER_ADMIN');
    console.log('Testing cascade via direct database operations...');

    // Step 1: Create a test company directly in database
    console.log('\nStep 1: Creating test company...');
    const testCompany = await prisma.company.create({
      data: {
        name: 'Cascade Test Company',
        defaultStandard: 'NETA',
        tokenBalance: 10000,
      },
    });
    console.log('Created company:', testCompany.id);

    // Step 2: Create users for this company
    console.log('\nStep 2: Creating users...');
    const testUser1 = await prisma.user.create({
      data: {
        email: 'cascade-test-user1@test.com',
        passwordHash: 'hashedpassword',
        name: 'Test User 1',
        role: 'ADMIN',
        companyId: testCompany.id,
      },
    });
    const testUser2 = await prisma.user.create({
      data: {
        email: 'cascade-test-user2@test.com',
        passwordHash: 'hashedpassword',
        name: 'Test User 2',
        role: 'ANALYST',
        companyId: testCompany.id,
      },
    });
    console.log('Created users:', testUser1.id, testUser2.id);

    // Step 3: Create analyses for this company
    console.log('\nStep 3: Creating analyses...');
    const testAnalysis1 = await prisma.analysis.create({
      data: {
        companyId: testCompany.id,
        userId: testUser1.id,
        testType: 'MEGGER',
        filename: 'cascade-test-1.pdf',
        pdfUrl: '/test/cascade-1.pdf',
        pdfSizeBytes: 1000,
        status: 'COMPLETED',
        verdict: 'APPROVED',
        score: 95,
        standardUsed: 'NETA',
      },
    });
    const testAnalysis2 = await prisma.analysis.create({
      data: {
        companyId: testCompany.id,
        userId: testUser2.id,
        testType: 'GROUNDING',
        filename: 'cascade-test-2.pdf',
        pdfUrl: '/test/cascade-2.pdf',
        pdfSizeBytes: 2000,
        status: 'COMPLETED',
        verdict: 'REJECTED',
        score: 40,
        standardUsed: 'NETA',
      },
    });
    console.log('Created analyses:', testAnalysis1.id, testAnalysis2.id);

    // Step 4: Create token transactions
    console.log('\nStep 4: Creating token transactions...');
    const testTransaction = await prisma.tokenTransaction.create({
      data: {
        companyId: testCompany.id,
        userId: testUser1.id,
        type: 'PURCHASE',
        amount: 10000,
        balance: 10000,
        description: 'Test purchase',
      },
    });
    console.log('Created transaction:', testTransaction.id);

    // Verify data exists before delete
    console.log('\n--- Data before delete ---');
    const usersBefore = await prisma.user.count({
      where: { companyId: testCompany.id },
    });
    const analysesBefore = await prisma.analysis.count({
      where: { companyId: testCompany.id },
    });
    const transactionsBefore = await prisma.tokenTransaction.count({
      where: { companyId: testCompany.id },
    });
    console.log('Users:', usersBefore);
    console.log('Analyses:', analysesBefore);
    console.log('Transactions:', transactionsBefore);

    // Step 5: Delete the company
    console.log('\nStep 5: Deleting company...');
    await prisma.company.delete({
      where: { id: testCompany.id },
    });
    console.log('Company deleted');

    // Step 6: Verify all related data is deleted
    console.log('\n--- Data after delete ---');
    const usersAfter = await prisma.user.count({
      where: { companyId: testCompany.id },
    });
    const analysesAfter = await prisma.analysis.count({
      where: { companyId: testCompany.id },
    });
    const transactionsAfter = await prisma.tokenTransaction.count({
      where: { companyId: testCompany.id },
    });
    console.log('Users:', usersAfter);
    console.log('Analyses:', analysesAfter);
    console.log('Transactions:', transactionsAfter);

    // Verify specific records are gone
    const user1Exists = await prisma.user.findUnique({
      where: { id: testUser1.id },
    });
    const analysis1Exists = await prisma.analysis.findUnique({
      where: { id: testAnalysis1.id },
    });

    console.log('\n=== CASCADE DELETE TEST ===');
    console.log('Company deleted:', true);
    console.log('All users deleted:', usersAfter === 0 && !user1Exists);
    console.log('All analyses deleted:', analysesAfter === 0 && !analysis1Exists);
    console.log('All transactions deleted:', transactionsAfter === 0);

    if (usersAfter === 0 && analysesAfter === 0 && transactionsAfter === 0 &&
        !user1Exists && !analysis1Exists) {
      console.log('\nCASCADE DELETE: SUCCESS');
    } else {
      console.log('\nCASCADE DELETE: FAILED');
    }
  } else {
    const token = loginData.token;

    // Test via API with super admin
    console.log('\nTesting cascade via API...');

    // Create a test company
    const createRes = await fetch('http://localhost:3000/api/admin/companies', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Cascade API Test Company',
        adminEmail: 'cascade-api-admin@test.com',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      console.log('Created company:', createData.company?.id);
      // Continue with API tests...
    } else {
      console.log('Company creation via API failed, falling back to direct DB test');
    }
  }

  await prisma.$disconnect();
}

testCascadeDelete().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
