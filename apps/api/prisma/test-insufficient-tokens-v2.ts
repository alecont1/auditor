// Test script for insufficient tokens error handling
// This version sets balance to a low value to ensure we can test
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testInsufficientTokens() {
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
    await prisma.$disconnect();
    process.exit(1);
  }

  const token = loginData.token;
  const companyId = loginData.user.companyId;

  // Get current token balance and save it
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tokenBalance: true },
  });
  const originalBalance = company?.tokenBalance || 0;
  console.log('Original token balance:', originalBalance);

  // Set balance to 500 (less than minimum 1000 required)
  await prisma.company.update({
    where: { id: companyId },
    data: { tokenBalance: 500 },
  });
  console.log('Set token balance to: 500');

  // Try to create an analysis - should fail with 402
  console.log('\nTrying to create analysis (requires ~1000 tokens min)...');

  const analysisRes = await fetch('http://localhost:3000/api/analysis', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'test-insufficient.pdf',
      testType: 'MEGGER',
      pdfSizeBytes: 100000, // Estimated: 1000 tokens
    }),
  });

  const analysisData = await analysisRes.json();
  console.log('\nResponse status:', analysisRes.status);
  console.log('Response body:', JSON.stringify(analysisData, null, 2));

  // Restore original balance
  await prisma.company.update({
    where: { id: companyId },
    data: { tokenBalance: originalBalance },
  });
  console.log('\nRestored token balance to:', originalBalance);

  console.log('\n=== INSUFFICIENT TOKENS ERROR TEST ===');
  const returns402 = analysisRes.status === 402;
  const hasMeaningfulMessage = analysisData.error === 'Insufficient Tokens' || analysisData.message?.toLowerCase().includes('token');
  const mentionsAmounts = analysisData.message?.includes('Required') || analysisData.message?.includes('Available');

  console.log('Returns 402 status:', returns402);
  console.log('Has meaningful error message:', hasMeaningfulMessage);
  console.log('Message mentions required/available:', mentionsAmounts);

  if (returns402 && hasMeaningfulMessage) {
    console.log('\nINSUFFICIENT TOKENS ERROR HANDLING: SUCCESS');
  } else {
    console.log('\nINSUFFICIENT TOKENS ERROR HANDLING: FAILED');
  }

  await prisma.$disconnect();
}

testInsufficientTokens().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
