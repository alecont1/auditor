// Test script for token estimate accuracy
async function testTokenEstimate() {
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

  // Test with different file sizes
  const testCases = [
    { size: 50000, name: 'small' },     // ~500 tokens, clamped to 1000
    { size: 300000, name: 'medium' },   // ~3000 tokens
    { size: 800000, name: 'large' },    // ~8000 tokens
    { size: 1500000, name: 'xlarge' },  // ~15000 tokens, clamped to 10000
  ];

  const results = [];

  for (const testCase of testCases) {
    // Calculate expected estimate (same formula as frontend)
    const estimatedTokens = Math.max(1000, Math.min(10000, Math.round(testCase.size / 100)));

    console.log(`\n--- Testing ${testCase.name} file (${testCase.size} bytes) ---`);
    console.log('Frontend estimate:', estimatedTokens, 'tokens');

    // Create analysis
    const createRes = await fetch('http://localhost:3000/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: `estimate-test-${testCase.name}.pdf`,
        testType: 'MEGGER',
        pdfSizeBytes: testCase.size,
      }),
    });

    const createData = await createRes.json();
    if (!createData.analysis) {
      console.log('Failed to create analysis');
      continue;
    }

    const analysisId = createData.analysis.id;

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Get actual consumption
    const analysisRes = await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const analysisData = await analysisRes.json();
    const actualTokens = analysisData.analysis?.tokensConsumed || 0;

    console.log('Actual consumption:', actualTokens, 'tokens');

    // Calculate accuracy
    const difference = Math.abs(actualTokens - estimatedTokens);
    const percentDiff = (difference / estimatedTokens) * 100;
    console.log('Difference:', difference, `(${percentDiff.toFixed(1)}%)`);

    const withinTolerance = percentDiff <= 20;
    console.log('Within 20% tolerance:', withinTolerance);

    results.push({
      name: testCase.name,
      estimated: estimatedTokens,
      actual: actualTokens,
      percentDiff,
      withinTolerance,
    });

    // Cleanup
    await fetch(`http://localhost:3000/api/analysis/${analysisId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  console.log('\n=== TOKEN ESTIMATE ACCURACY TEST ===');
  console.log('\nResults summary:');
  for (const result of results) {
    console.log(`  ${result.name}: estimate=${result.estimated}, actual=${result.actual}, diff=${result.percentDiff.toFixed(1)}%, ok=${result.withinTolerance}`);
  }

  const allWithinTolerance = results.every((r) => r.withinTolerance);
  console.log('\nAll estimates within 20%:', allWithinTolerance);

  if (allWithinTolerance) {
    console.log('\nTOKEN ESTIMATE ACCURACY: SUCCESS');
  } else {
    console.log('\nTOKEN ESTIMATE ACCURACY: NEEDS REVIEW');
  }
}

testTokenEstimate().catch(console.error);
