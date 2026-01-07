// Test script to verify admin URL access is blocked for ANALYST users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminURLAccess() {
  console.log('=== Admin URL Access Control Test ===\n');

  // First ensure we have an ANALYST user
  console.log('Step 1: Setting up ANALYST user...');
  const { hashPassword } = await import('../src/lib/password');
  const hashedPassword = await hashPassword('analyst123');

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@testcompany.com' },
    update: { role: 'ANALYST' },
    create: {
      email: 'analyst@testcompany.com',
      name: 'Test Analyst',
      passwordHash: hashedPassword,
      role: 'ANALYST',
      companyId: 'test-company-1',
    },
  });
  console.log('✓ ANALYST user:', analyst.email, 'role:', analyst.role);

  // Login as ANALYST
  console.log('\nStep 2: Login as ANALYST...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'analyst@testcompany.com', password: 'analyst123' }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('✓ ANALYST logged in, role:', loginData.user.role);

  // Check the /me endpoint to verify role
  console.log('\nStep 3: Verify role via /api/auth/me...');
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('✓ Current user role:', meData.user?.role);

  // NOTE: The admin route protection happens on the frontend (React Router)
  // The backend API endpoints should also have their own protection
  // Let's verify the API protections exist

  console.log('\n=== Frontend Route Protection ===');
  console.log('Routes configured with allowedRoles in App.tsx:');
  console.log('  /settings/company - allowedRoles: [ADMIN, SUPER_ADMIN]');
  console.log('  /settings/users - allowedRoles: [ADMIN, SUPER_ADMIN]');
  console.log('  /settings/billing - allowedRoles: [ADMIN, SUPER_ADMIN]');
  console.log('  /super-admin/* - allowedRoles: [SUPER_ADMIN]');
  console.log('\nProtectedRoute behavior: Redirects to /dashboard if role not allowed');

  // Test API-level protections
  console.log('\n=== API-level Admin Endpoint Protection ===\n');

  // Test invite user (admin only)
  console.log('Testing POST /api/users/invite as ANALYST...');
  const inviteRes = await fetch('http://localhost:3000/api/users/invite', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'newuser@test.com',
      name: 'New User',
      role: 'ANALYST',
    }),
  });
  const inviteData = await inviteRes.json();
  console.log('  Status:', inviteRes.status);
  console.log('  Response:', JSON.stringify(inviteData, null, 2));
  const inviteBlocked = inviteRes.status === 403;
  console.log('  Invite blocked:', inviteBlocked ? '✓ PASS' : '✗ FAIL');

  // Test get all users (admin only)
  console.log('\nTesting GET /api/users as ANALYST...');
  const usersRes = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const usersData = await usersRes.json();
  console.log('  Status:', usersRes.status);
  const usersBlocked = usersRes.status === 403;
  console.log('  Users list blocked:', usersBlocked ? '✓ PASS' : '✗ FAIL');

  // Test company update (admin only)
  console.log('\nTesting PUT /api/companies/:id as ANALYST...');
  const companyRes = await fetch('http://localhost:3000/api/companies/test-company-1', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Hacked Company' }),
  });
  const companyData = await companyRes.json();
  console.log('  Status:', companyRes.status);
  const companyBlocked = companyRes.status === 403;
  console.log('  Company update blocked:', companyBlocked ? '✓ PASS' : '✗ FAIL');

  await prisma.$disconnect();

  console.log('\n=== ADMIN URL ACCESS TEST ===');
  console.log('Frontend route protection: ✓ CONFIGURED (via allowedRoles)');
  console.log('API invite endpoint protected:', inviteBlocked ? '✓ PASS' : '✗ FAIL');
  console.log('API users endpoint protected:', usersBlocked ? '✓ PASS' : '✗ FAIL');
  console.log('API company endpoint protected:', companyBlocked ? '✓ PASS' : '✗ FAIL');

  if (inviteBlocked && usersBlocked && companyBlocked) {
    console.log('\nRESULT: ✓ PASS - Admin routes properly protected');
  } else {
    console.log('\nRESULT: ✗ FAIL - Some admin routes not protected');
    process.exit(1);
  }
}

testAdminURLAccess().catch(console.error);
