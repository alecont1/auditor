// Test script for bulk export workflow
async function testBulkExportWorkflow() {
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

  // Step 1: Create multiple analyses
  console.log('\nStep 1: Creating multiple analyses...');
  const analysisIds: string[] = [];

  for (let i = 0; i < 3; i++) {
    const createRes = await fetch('http://localhost:3000/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: `bulk-export-test-${i + 1}.pdf`,
        testType: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'][i],
        pdfSizeBytes: 1000 * (i + 1),
      }),
    });

    const createData = await createRes.json();
    if (createData.analysis) {
      analysisIds.push(createData.analysis.id);
      console.log(`Created analysis ${i + 1}:`, createData.analysis.id);
    }
  }

  if (analysisIds.length < 2) {
    console.error('Failed to create enough analyses');
    process.exit(1);
  }

  // Wait for processing
  console.log('\nWaiting for processing...');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Step 2: Navigate to History (verify list endpoint works)
  console.log('\nStep 2: Verify analyses are in history...');
  const historyRes = await fetch('http://localhost:3000/api/analysis', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyData = await historyRes.json();
  console.log('Total analyses in history:', historyData.analyses?.length);

  // Step 3: Select multiple analyses (simulate via API)
  console.log('\nStep 3: Selecting analyses for export...');
  const selectedIds = analysisIds.slice(0, 2); // Select first 2
  console.log('Selected IDs:', selectedIds);

  // Step 4 & 5: Bulk export as JSON
  console.log('\nStep 4: Testing JSON export...');
  const jsonExportRes = await fetch('http://localhost:3000/api/analysis/bulk-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: selectedIds,
      format: 'json',
    }),
  });

  const jsonExportSuccess = jsonExportRes.ok;
  console.log('JSON export status:', jsonExportRes.status);
  console.log('Content-Type:', jsonExportRes.headers.get('Content-Type'));
  console.log('Content-Disposition:', jsonExportRes.headers.get('Content-Disposition'));

  if (jsonExportRes.ok) {
    const jsonData = await jsonExportRes.json();
    console.log('JSON export count:', jsonData.count);
    console.log('JSON export has analyses:', jsonData.analyses?.length > 0);
    console.log('First analysis filename:', jsonData.analyses?.[0]?.filename);
  }

  // Step 5 alternative: Bulk export as CSV
  console.log('\nStep 5: Testing CSV export...');
  const csvExportRes = await fetch('http://localhost:3000/api/analysis/bulk-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: selectedIds,
      format: 'csv',
    }),
  });

  const csvExportSuccess = csvExportRes.ok;
  console.log('CSV export status:', csvExportRes.status);
  console.log('Content-Type:', csvExportRes.headers.get('Content-Type'));
  console.log('Content-Disposition:', csvExportRes.headers.get('Content-Disposition'));

  if (csvExportRes.ok) {
    const csvContent = await csvExportRes.text();
    const csvLines = csvContent.split('\n').length;
    console.log('CSV lines (header + data rows):', csvLines);
    console.log('CSV contains header:', csvContent.includes('Filename'));
    console.log('CSV contains our test files:', csvContent.includes('bulk-export-test'));
  }

  // Step 6: Verify download triggers (already done in steps 4-5)
  // Step 7: Verify exported file contains all selected analyses
  console.log('\nStep 7: Verify export contains all selected analyses...');
  const verifyExportRes = await fetch('http://localhost:3000/api/analysis/bulk-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: selectedIds,
      format: 'json',
    }),
  });

  let allAnalysesIncluded = false;
  if (verifyExportRes.ok) {
    const verifyData = await verifyExportRes.json();
    const exportedIds = verifyData.analyses?.map((a: any) => a.id) || [];
    allAnalysesIncluded = selectedIds.every((id) => exportedIds.includes(id));
    console.log('All selected analyses included:', allAnalysesIncluded);
  }

  // Test edge cases
  console.log('\n--- Edge Cases ---');

  // Test empty selection
  const emptyRes = await fetch('http://localhost:3000/api/analysis/bulk-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: [],
      format: 'json',
    }),
  });
  console.log('Empty selection returns 400:', emptyRes.status === 400);

  // Test non-existent IDs
  const fakeRes = await fetch('http://localhost:3000/api/analysis/bulk-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: ['fake-id-123'],
      format: 'json',
    }),
  });
  console.log('Non-existent IDs returns 404:', fakeRes.status === 404);

  // Cleanup: Delete test analyses
  console.log('\n--- Cleanup ---');
  for (const id of analysisIds) {
    await fetch(`http://localhost:3000/api/analysis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  console.log('Deleted test analyses');

  console.log('\n=== BULK EXPORT WORKFLOW TEST ===');
  console.log('Analyses created:', analysisIds.length >= 2);
  console.log('JSON export succeeded:', jsonExportSuccess);
  console.log('CSV export succeeded:', csvExportSuccess);
  console.log('All selected analyses included:', allAnalysesIncluded);
  console.log('Empty selection rejected:', emptyRes.status === 400);

  if (jsonExportSuccess && csvExportSuccess && allAnalysesIncluded && emptyRes.status === 400) {
    console.log('\nBULK EXPORT WORKFLOW: SUCCESS');
  } else {
    console.log('\nBULK EXPORT WORKFLOW: FAILED');
  }
}

testBulkExportWorkflow().catch(console.error);
