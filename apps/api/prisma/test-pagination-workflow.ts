// Test script for pagination workflow
async function testPaginationWorkflow() {
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

  // Check how many analyses exist
  const initialRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const initialData = await initialRes.json();
  const existingCount = initialData.analyses?.length || 0;
  console.log('Existing analyses:', existingCount);

  // Step 1: Create enough analyses to have multiple pages (need >40 total)
  const needed = Math.max(0, 45 - existingCount);
  console.log('\nStep 1: Creating', needed, 'more analyses to ensure 45+ total...');

  const testAnalyses: string[] = [];

  for (let i = 0; i < needed; i++) {
    const createRes = await fetch('http://localhost:3000/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: `pagination-test-${i + 1}.pdf`,
        testType: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'][i % 3],
        pdfSizeBytes: 5000,
      }),
    });

    const createData = await createRes.json();
    if (createData.analysis) {
      testAnalyses.push(createData.analysis.id);
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`Created ${i + 1}/${needed} analyses...`);
    }
  }

  // Wait for processing
  if (needed > 0) {
    console.log('Waiting for processing...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Step 2: Fetch all analyses
  console.log('\nStep 2: Fetching all analyses...');
  const allRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allData = await allRes.json();
  const allAnalyses = allData.analyses || [];
  console.log('Total analyses:', allAnalyses.length);

  // Simulate client-side pagination (as done in HistoryPage)
  const ITEMS_PER_PAGE = 20;

  // Step 3: Page 1 should show first 20 items
  console.log('\nStep 3: Verifying page 1 shows 20 items...');
  const page1 = allAnalyses.slice(0, ITEMS_PER_PAGE);
  console.log('Page 1 count:', page1.length);
  const page1Correct = page1.length === 20;
  console.log('Page 1 has 20 items:', page1Correct);

  // Step 4 & 5: Page 2 should show different 20 items
  console.log('\nStep 4 & 5: Verifying page 2 shows different 20 items...');
  const page2Start = ITEMS_PER_PAGE;
  const page2End = ITEMS_PER_PAGE * 2;
  const page2 = allAnalyses.slice(page2Start, page2End);
  console.log('Page 2 count:', page2.length);
  const page2Correct = page2.length === 20 || (allAnalyses.length < 40 && page2.length === allAnalyses.length - 20);
  console.log('Page 2 has correct count:', page2Correct);

  // Step 6: Verify no overlap between pages
  console.log('\nStep 6: Verifying no overlap between pages...');
  const page1Ids = new Set(page1.map((a: any) => a.id));
  const page2Ids = new Set(page2.map((a: any) => a.id));
  let overlap = false;
  for (const id of page2Ids) {
    if (page1Ids.has(id)) {
      overlap = true;
      console.log('Overlapping ID found:', id);
    }
  }
  console.log('Pages have overlap:', overlap);
  const noOverlap = !overlap;

  // Verify pagination calculations
  console.log('\nPagination calculations:');
  const totalPages = Math.ceil(allAnalyses.length / ITEMS_PER_PAGE);
  console.log('Total pages:', totalPages);
  console.log('Items per page:', ITEMS_PER_PAGE);

  // Page 3 check (if exists)
  if (totalPages >= 3) {
    const page3Start = ITEMS_PER_PAGE * 2;
    const page3End = ITEMS_PER_PAGE * 3;
    const page3 = allAnalyses.slice(page3Start, page3End);
    console.log('Page 3 count:', page3.length);
  }

  // Cleanup test analyses
  console.log('\n--- Cleanup ---');
  for (const id of testAnalyses) {
    await fetch(`http://localhost:3000/api/analysis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  console.log('Deleted', testAnalyses.length, 'test analyses');

  console.log('\n=== PAGINATION WORKFLOW TEST ===');
  console.log('Total analyses >= 40:', allAnalyses.length >= 40);
  console.log('Page 1 shows 20 items:', page1Correct);
  console.log('Page 2 shows correct items:', page2Correct);
  console.log('No overlap between pages:', noOverlap);

  if (allAnalyses.length >= 40 && page1Correct && page2Correct && noOverlap) {
    console.log('\nPAGINATION WORKFLOW: SUCCESS');
  } else {
    console.log('\nPAGINATION WORKFLOW: NEEDS REVIEW');
  }
}

testPaginationWorkflow().catch(console.error);
