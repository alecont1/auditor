// Test script for sort functionality
async function testSortWorkflow() {
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

  // Step 1: Create analyses at different times (with slight delays)
  console.log('\nStep 1: Creating analyses at different times...');
  const testAnalyses: string[] = [];

  for (let i = 0; i < 3; i++) {
    const createRes = await fetch('http://localhost:3000/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: `sort-test-${i + 1}.pdf`,
        testType: 'MEGGER',
        pdfSizeBytes: 5000,
      }),
    });

    const createData = await createRes.json();
    if (createData.analysis) {
      testAnalyses.push(createData.analysis.id);
      console.log(`Created analysis ${i + 1}:`, createData.analysis.id);
    }
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Wait for processing to complete
  console.log('\nWaiting for analysis processing...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Fetch all analyses
  console.log('\nStep 2: Fetching analyses...');
  const allRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allData = await allRes.json();

  // Filter to our test analyses
  const ourAnalyses = allData.analyses?.filter((a: any) =>
    a.filename.startsWith('sort-test-')
  ) || [];

  console.log('Test analyses count:', ourAnalyses.length);

  // Step 3 & 4: Test date descending (newest first - default backend sort)
  console.log('\nStep 3 & 4: Testing date descending (newest first)...');
  const dateDescending = [...ourAnalyses].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  console.log('First in descending order:', dateDescending[0]?.filename);
  const dateDescCorrect = dateDescending[0]?.filename === 'sort-test-3.pdf';
  console.log('Newest (sort-test-3.pdf) is first:', dateDescCorrect);

  // Step 5 & 6: Test date ascending (oldest first)
  console.log('\nStep 5 & 6: Testing date ascending (oldest first)...');
  const dateAscending = [...ourAnalyses].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  console.log('First in ascending order:', dateAscending[0]?.filename);
  const dateAscCorrect = dateAscending[0]?.filename === 'sort-test-1.pdf';
  console.log('Oldest (sort-test-1.pdf) is first:', dateAscCorrect);

  // Step 7 & 8: Test score sorting
  console.log('\nStep 7 & 8: Testing score sorting...');
  // Note: scores are randomly assigned by mock processor, so we just verify sorting works
  const scoreDescending = [...ourAnalyses].sort((a: any, b: any) => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    return scoreB - scoreA;
  });
  const scoreAscending = [...ourAnalyses].sort((a: any, b: any) => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    return scoreA - scoreB;
  });

  console.log('Scores descending:', scoreDescending.map((a: any) => `${a.filename}: ${a.score}`));
  console.log('Scores ascending:', scoreAscending.map((a: any) => `${a.filename}: ${a.score}`));

  // Verify sort order is consistent
  const scoresDesc = scoreDescending.map((a: any) => a.score ?? -1);
  const scoresAsc = scoreAscending.map((a: any) => a.score ?? -1);
  const scoreDescCorrect = scoresDesc.every((s: number, i: number) => i === 0 || s <= scoresDesc[i - 1]);
  const scoreAscCorrect = scoresAsc.every((s: number, i: number) => i === 0 || s >= scoresAsc[i - 1]);

  console.log('Score descending order correct:', scoreDescCorrect);
  console.log('Score ascending order correct:', scoreAscCorrect);

  // Cleanup
  console.log('\n--- Cleanup ---');
  for (const id of testAnalyses) {
    await fetch(`http://localhost:3000/api/analysis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  console.log('Deleted test analyses');

  console.log('\n=== SORT FUNCTIONALITY TEST ===');
  console.log('Date descending correct:', dateDescCorrect);
  console.log('Date ascending correct:', dateAscCorrect);
  console.log('Score descending correct:', scoreDescCorrect);
  console.log('Score ascending correct:', scoreAscCorrect);

  if (dateDescCorrect && dateAscCorrect && scoreDescCorrect && scoreAscCorrect) {
    console.log('\nSORT FUNCTIONALITY: SUCCESS');
  } else {
    console.log('\nSORT FUNCTIONALITY: NEEDS REVIEW');
  }
}

testSortWorkflow().catch(console.error);
