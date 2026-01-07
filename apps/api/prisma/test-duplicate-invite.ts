// Test script for duplicate email invitation error
async function testDuplicateInvite() {
  // First login as admin
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

  // Step 1: Send first invitation
  const testEmail = `test-dup-${Date.now()}@example.com`;
  console.log('\nStep 1: Sending first invitation to', testEmail);

  const invite1Res = await fetch('http://localhost:3000/api/users/invite', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      role: 'ANALYST',
    }),
  });

  const invite1Data = await invite1Res.json();
  console.log('First invite status:', invite1Res.status);
  console.log('First invite success:', invite1Data.success);

  // Step 2: Try to send same invitation again
  console.log('\nStep 2: Sending duplicate invitation to', testEmail);

  const invite2Res = await fetch('http://localhost:3000/api/users/invite', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      role: 'ANALYST',
    }),
  });

  const invite2Data = await invite2Res.json();
  console.log('Duplicate invite status:', invite2Res.status);
  console.log('Duplicate invite response:', invite2Data);

  console.log('\n=== DUPLICATE EMAIL INVITATION TEST ===');
  console.log('First invite succeeds:', invite1Res.status === 200);
  console.log('Duplicate returns 409 Conflict:', invite2Res.status === 409);
  console.log('Has "already exists" message:', invite2Data.message?.includes('already exists'));

  if (invite1Res.status === 200 && invite2Res.status === 409 && invite2Data.message?.includes('already exists')) {
    console.log('\nDUPLICATE EMAIL INVITATION ERROR: SUCCESS');
  } else {
    console.log('\nDUPLICATE EMAIL INVITATION ERROR: FAILED');
  }
}

testDuplicateInvite().catch(console.error);
