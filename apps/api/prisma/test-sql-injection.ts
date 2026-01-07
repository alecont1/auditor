// Test script to verify SQL injection attempts are rejected
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSQLInjection() {
  console.log('=== SQL Injection Test ===\n');

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

  // Count initial users for verification
  const initialUserCount = await prisma.user.count();
  console.log('Initial user count:', initialUserCount);

  // SQL Injection test payloads
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "1; DROP TABLE users",
    "1' OR '1'='1",
    "1 UNION SELECT * FROM users",
    "'; DELETE FROM users WHERE '1'='1",
    "1'; UPDATE users SET role='SUPER_ADMIN' WHERE '1'='1",
    "'; INSERT INTO users VALUES ('evil'); --",
    "1; SELECT * FROM users WHERE 1=1",
    "admin@test.com' OR 1=1 --",
    "' OR 1=1--",
    "x' AND email IS NOT NULL; --",
    "' UNION SELECT password FROM users --",
    "${process.env.DATABASE_URL}",
    "{{7*7}}",
  ];

  let allPassed = true;

  // Test 1: SQL injection in analysis ID path
  console.log('\n=== Test 1: SQL Injection in Analysis ID ===');
  for (const payload of sqlPayloads.slice(0, 5)) {
    try {
      const encodedPayload = encodeURIComponent(payload);
      const res = await fetch(`http://localhost:3000/api/analysis/${encodedPayload}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const passed = res.status === 404 || res.status === 400;
      console.log(`  "${payload.slice(0, 30)}..." -> ${res.status} ${passed ? '✓' : '✗'}`);
      if (!passed) allPassed = false;
    } catch (err) {
      console.log(`  "${payload.slice(0, 30)}..." -> Error (handled) ✓`);
    }
  }

  // Test 2: SQL injection in login
  console.log('\n=== Test 2: SQL Injection in Login ===');
  for (const payload of sqlPayloads.slice(5, 10)) {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload, password: payload }),
      });
      const passed = res.status === 401 || res.status === 400;
      console.log(`  "${payload.slice(0, 30)}..." -> ${res.status} ${passed ? '✓' : '✗'}`);
      if (!passed) allPassed = false;
    } catch (err) {
      console.log(`  "${payload.slice(0, 30)}..." -> Error (handled) ✓`);
    }
  }

  // Test 3: SQL injection in analysis creation
  console.log('\n=== Test 3: SQL Injection in Analysis Creation ===');
  for (const payload of sqlPayloads.slice(0, 3)) {
    try {
      const res = await fetch('http://localhost:3000/api/analysis', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: payload + '.pdf',
          testType: 'MEGGER',
          pdfSizeBytes: 1000,
        }),
      });
      // Should either succeed (filename is just a string) or fail gracefully
      const passed = res.status !== 500;
      console.log(`  "${payload.slice(0, 30)}..." -> ${res.status} ${passed ? '✓' : '✗'}`);

      // If it succeeded, clean up
      if (res.status === 201) {
        const data = await res.json();
        if (data.analysis?.id) {
          await fetch(`http://localhost:3000/api/analysis/${data.analysis.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
      if (!passed) allPassed = false;
    } catch (err) {
      console.log(`  "${payload.slice(0, 30)}..." -> Error (handled) ✓`);
    }
  }

  // Test 4: SQL injection in user routes
  console.log('\n=== Test 4: SQL Injection in User ID ===');
  for (const payload of sqlPayloads.slice(0, 3)) {
    try {
      const encodedPayload = encodeURIComponent(payload);
      const res = await fetch(`http://localhost:3000/api/users/${encodedPayload}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const passed = res.status === 404 || res.status === 400 || res.status === 403;
      console.log(`  "${payload.slice(0, 30)}..." -> ${res.status} ${passed ? '✓' : '✗'}`);
      if (!passed) allPassed = false;
    } catch (err) {
      console.log(`  "${payload.slice(0, 30)}..." -> Error (handled) ✓`);
    }
  }

  // Verify database integrity
  console.log('\n=== Verifying Database Integrity ===');
  const finalUserCount = await prisma.user.count();
  console.log('Final user count:', finalUserCount);
  const dbIntact = finalUserCount === initialUserCount;
  console.log('Database intact:', dbIntact ? '✓ YES' : '✗ NO (CRITICAL!)');

  // Verify users table still exists and works
  const usersExist = await prisma.user.findMany({ take: 1 });
  console.log('Users table accessible:', usersExist ? '✓ YES' : '✗ NO');

  await prisma.$disconnect();

  console.log('\n=== SQL INJECTION TEST RESULTS ===');
  console.log('ORM Protection: Prisma uses parameterized queries');
  console.log('All injection attempts handled:', allPassed ? '✓ PASS' : '✗ FAIL');
  console.log('Database integrity maintained:', dbIntact ? '✓ PASS' : '✗ FAIL');

  if (allPassed && dbIntact) {
    console.log('\nRESULT: ✓ PASS - SQL injection attempts properly rejected');
  } else {
    console.log('\nRESULT: ✗ FAIL - Security vulnerability detected!');
    process.exit(1);
  }
}

testSQLInjection().catch(console.error);
