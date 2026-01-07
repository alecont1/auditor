// Test script to verify deleted user is removed from user list
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDeleteUser() {
  console.log('=== Delete User Test ===\n');

  // Login as admin
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

  // Step 1: Create a test user to delete
  console.log('\nStep 1: Creating test user...');
  const { hashPassword } = await import('../src/lib/password');
  const hashedPassword = await hashPassword('test123');

  const testUser = await prisma.user.create({
    data: {
      email: 'delete-test-user@testcompany.com',
      name: 'Delete Test User',
      passwordHash: hashedPassword,
      role: 'ANALYST',
      companyId: 'test-company-1',
    },
  });
  console.log('✓ Created test user:', testUser.id);

  // Step 2: Verify user appears in list
  console.log('\nStep 2: Verifying user in list...');
  const listRes1 = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData1 = await listRes1.json();
  const userInList = listData1.users.some((u: any) => u.id === testUser.id);
  const countBefore = listData1.users.length;
  console.log('  User in list:', userInList ? '✓' : '✗');
  console.log('  User count:', countBefore);

  // Step 3: Delete the user
  console.log('\nStep 3: Deleting the user...');
  const deleteRes = await fetch(`http://localhost:3000/api/users/${testUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  console.log('  Delete status:', deleteRes.status);
  console.log('  Delete response:', deleteData.message || deleteData);

  // Step 4: Verify user removed from list
  console.log('\nStep 4: Verifying user removed from list...');
  const listRes2 = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData2 = await listRes2.json();
  const userNotInList = !listData2.users.some((u: any) => u.id === testUser.id);
  const countAfter = listData2.users.length;
  console.log('  User removed from list:', userNotInList ? '✓' : '✗');
  console.log('  User count:', countAfter);
  console.log('  Count decreased:', countAfter < countBefore ? '✓' : '✗');

  // Step 5: Verify direct access returns 404
  console.log('\nStep 5: Verifying direct access returns 404...');
  const directRes = await fetch(`http://localhost:3000/api/users/${testUser.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const directReturns404 = directRes.status === 404;
  console.log('  Direct access returns 404:', directReturns404 ? '✓' : '✗');

  await prisma.$disconnect();

  console.log('\n=== DELETE USER TEST ===');
  const allPassed = userInList && userNotInList && directReturns404 && countAfter < countBefore;
  console.log('User properly removed:', allPassed ? '✓ PASS' : '✗ FAIL');

  if (allPassed) {
    console.log('\nRESULT: ✓ PASS - Delete user removes from all views');
  } else {
    console.log('\nRESULT: ✗ FAIL - Delete user did not work properly');
    // Cleanup if delete failed
    try {
      await prisma.user.delete({ where: { id: testUser.id } });
    } catch {
      // Already deleted
    }
    process.exit(1);
  }
}

testDeleteUser().catch(console.error);
