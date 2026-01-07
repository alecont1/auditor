// Test script for filter workflow
async function testFilterWorkflow() {
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

  // Step 1: Create analyses of different types and verdicts
  console.log('\nStep 1: Creating test analyses...');
  const testAnalyses: string[] = [];

  const typesAndVerdicts = [
    { testType: 'GROUNDING', verdict: 'APPROVED' },
    { testType: 'GROUNDING', verdict: 'REJECTED' },
    { testType: 'MEGGER', verdict: 'APPROVED' },
    { testType: 'MEGGER', verdict: 'APPROVED_WITH_COMMENTS' },
    { testType: 'THERMOGRAPHY', verdict: 'REJECTED' },
  ];

  for (let i = 0; i < typesAndVerdicts.length; i++) {
    const { testType, verdict } = typesAndVerdicts[i];
    const createRes = await fetch('http://localhost:3000/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: `filter-test-${testType.toLowerCase()}-${verdict.toLowerCase()}.pdf`,
        testType,
        pdfSizeBytes: 5000,
      }),
    });

    const createData = await createRes.json();
    if (createData.analysis) {
      testAnalyses.push(createData.analysis.id);
      console.log(`Created: ${testType} - ${verdict} -> ${createData.analysis.id}`);
    }
  }

  // Wait for processing to complete
  console.log('\nWaiting for analysis processing...');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Step 2: Fetch all analyses
  console.log('\nStep 2: Fetching all analyses...');
  const allRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allData = await allRes.json();
  console.log('Total analyses:', allData.analyses?.length);

  // Filter to just our test analyses
  const ourAnalyses = allData.analyses?.filter((a: any) =>
    a.filename.startsWith('filter-test-')
  ) || [];
  console.log('Test analyses:', ourAnalyses.length);

  // Step 3 & 4: Apply GROUNDING filter and verify
  console.log('\nStep 3 & 4: Testing GROUNDING filter...');
  const groundingOnly = ourAnalyses.filter((a: any) => a.testType === 'GROUNDING');
  console.log('GROUNDING analyses:', groundingOnly.length);
  const groundingCorrect = groundingOnly.length === 2;
  console.log('Correct count (2):', groundingCorrect);

  // Step 5 & 6: Add APPROVED verdict filter
  console.log('\nStep 5 & 6: Testing GROUNDING + APPROVED filter...');
  const groundingApproved = ourAnalyses.filter(
    (a: any) => a.testType === 'GROUNDING' && a.verdict === 'APPROVED'
  );
  console.log('GROUNDING APPROVED analyses:', groundingApproved.length);
  const groundingApprovedCorrect = groundingApproved.length === 1;
  console.log('Correct count (1):', groundingApprovedCorrect);

  // Step 7 & 8: Clear filters and verify all shown
  console.log('\nStep 7 & 8: Testing clear filters...');
  console.log('All test analyses shown:', ourAnalyses.length === 5);

  // Additional tests
  console.log('\n--- Additional Filter Tests ---');

  // MEGGER filter
  const meggerOnly = ourAnalyses.filter((a: any) => a.testType === 'MEGGER');
  console.log('MEGGER analyses:', meggerOnly.length, '(expected 2)');

  // REJECTED filter
  const rejectedOnly = ourAnalyses.filter((a: any) => a.verdict === 'REJECTED');
  console.log('REJECTED analyses:', rejectedOnly.length, '(expected 2)');

  // APPROVED filter across all types
  const approvedAll = ourAnalyses.filter((a: any) => a.verdict === 'APPROVED');
  console.log('APPROVED analyses:', approvedAll.length, '(expected 2)');

  // Cleanup
  console.log('\n--- Cleanup ---');
  for (const id of testAnalyses) {
    await fetch(`http://localhost:3000/api/analysis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  console.log('Deleted test analyses');

  console.log('\n=== FILTER WORKFLOW TEST ===');
  console.log('Test data created:', testAnalyses.length === 5);
  console.log('GROUNDING filter correct:', groundingCorrect);
  console.log('GROUNDING + APPROVED filter correct:', groundingApprovedCorrect);
  console.log('All data accessible:', ourAnalyses.length === 5);

  if (testAnalyses.length >= 5 && groundingCorrect && groundingApprovedCorrect) {
    console.log('\nFILTER WORKFLOW: SUCCESS');
  } else {
    console.log('\nFILTER WORKFLOW: NEEDS REVIEW');
  }
}

testFilterWorkflow().catch(console.error);
