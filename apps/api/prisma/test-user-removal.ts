// Test script for user removal workflow
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testUserRemovalWorkflow() {
  // First login as admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@testcompany.com', password: 'admin123' }),
  });

  const loginData = await loginRes.json();
  console.log('Login as ADMIN:', loginData.user?.email || 'failed');

  if (!loginData.token) {
    console.error('Login failed');
    process.exit(1);
  }

  const token = loginData.token;
  const companyId = loginData.user.companyId;

  // Step 1: Create a test user to remove
  console.log('\nStep 1: Creating test user...');
  const passwordHash = await bcrypt.hash('testpass123', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'testuser@testcompany.com',
      name: 'Test User To Remove',
      passwordHash,
      role: 'ANALYST',
      companyId,
    },
  });
  console.log('Created test user:', testUser.id);

  // Step 2: Verify user appears in list
  console.log('\nStep 2: Checking user list...');
  const listRes = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  const userInList = listData.users.some((u: any) => u.id === testUser.id);
  console.log('User in list:', userInList);

  // Step 3: Verify user can log in
  console.log('\nStep 3: Verify user can log in...');
  const userLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testuser@testcompany.com', password: 'testpass123' }),
  });
  console.log('User can log in:', userLoginRes.status === 200);

  // Step 4: Delete the user
  console.log('\nStep 4: Removing user...');
  const deleteRes = await fetch(`http://localhost:3000/api/users/${testUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  console.log('Delete response:', deleteData);

  // Step 5: Verify user removed from list
  console.log('\nStep 5: Checking user removed from list...');
  const list2Res = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list2Data = await list2Res.json();
  const userStillInList = list2Data.users.some((u: any) => u.id === testUser.id);
  console.log('User removed from list:', !userStillInList);

  // Step 6: Verify removed user cannot log in
  console.log('\nStep 6: Verify removed user cannot log in...');
  const userLogin2Res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testuser@testcompany.com', password: 'testpass123' }),
  });
  console.log('User login fails:', userLogin2Res.status === 401);

  console.log('\n=== USER REMOVAL WORKFLOW TEST ===');
  console.log('User created:', !!testUser.id);
  console.log('User in list initially:', userInList);
  console.log('Delete succeeded:', deleteRes.status === 200);
  console.log('User removed from list:', !userStillInList);
  console.log('Removed user cannot log in:', userLogin2Res.status === 401);

  if (deleteRes.status === 200 && !userStillInList && userLogin2Res.status === 401) {
    console.log('\nUSER REMOVAL WORKFLOW: SUCCESS');
  } else {
    console.log('\nUSER REMOVAL WORKFLOW: FAILED');
  }

  await prisma.$disconnect();
}

testUserRemovalWorkflow().catch(console.error);
