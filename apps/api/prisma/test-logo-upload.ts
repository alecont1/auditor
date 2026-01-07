// Test script for logo upload
async function testLogoUpload() {
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
  const companyId = loginData.user.companyId;

  // Get company before upload
  const beforeRes = await fetch(`http://localhost:3000/api/companies/${companyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const beforeData = await beforeRes.json();
  console.log('Logo before:', beforeData.company?.logoUrl || 'null');

  // Upload logo
  const uploadRes = await fetch(`http://localhost:3000/api/companies/${companyId}/logo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
      filename: 'company-logo.png',
    }),
  });

  const uploadData = await uploadRes.json();
  console.log('Upload result:', uploadData);

  // Get company after upload
  const afterRes = await fetch(`http://localhost:3000/api/companies/${companyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterData = await afterRes.json();
  console.log('Logo after:', afterData.company?.logoUrl);

  // Verify logo persists
  if (afterData.company?.logoUrl) {
    console.log('\nLogo upload workflow: SUCCESS');
    console.log('Logo persists after refresh: YES');
  } else {
    console.log('\nLogo upload workflow: FAILED');
  }
}

testLogoUpload().catch(console.error);
