// backend/test_phase5_insights.js
// Automated verification for Phase 5 AI Insights Rule Engine

const BASE_URL = 'http://127.0.0.1:5000';

async function runInsightsTests() {
  console.log('=== Starting Phase 5 AI Insights Engine Verification ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Admin login to get JWT
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_number: 'ADM10822',
        password: 'Admin@123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.success, 'Admin login succeeded');
    const adminToken = adminLoginData.token || (adminLoginData.data && adminLoginData.data.token);

    // 2. Fetch Admin Dashboard with insights
    const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard?timeRange=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success, 'Admin dashboard API returns 200 OK');

    const insights = dashData.insights || (dashData.data && dashData.data.insights);
    assert(Array.isArray(insights), 'Dashboard response includes insights array');
    console.log(`Received ${insights.length} insight cards from live rule engine:`);
    insights.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.category}] ${item.title} (Target: ${item.targetTab}, Severity: ${item.severity})`);
    });

    assert(insights.length > 0, 'Rule engine produces at least one actionable insight');

    // 3. Check schema of each insight card
    const hasValidFields = insights.every(item =>
      item.id &&
      item.category &&
      item.categoryLabel &&
      item.title &&
      item.description &&
      item.recommendation &&
      item.targetTab &&
      item.actionText &&
      item.icon &&
      item.severity &&
      item.metric
    );
    assert(hasValidFields, 'Every insight object complies with the full UI card specification schema');

    // 4. Check for high risk equipment or repeated failure or underutilized resources
    const categories = insights.map(i => i.category);
    console.log('Categories surfaced:', categories);
    assert(
      categories.includes('HIGH_RISK_EQUIPMENT') ||
      categories.includes('REPEATED_FAILURE') ||
      categories.includes('RESOURCE_OPTIMIZATION') ||
      categories.includes('QUEUE_ANOMALY'),
      'AI Insights engine correctly categorized domain events'
    );

    console.log(`\n=== Insights Verification Summary: ${passed} PASSED, ${failed} FAILED ===`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Insights test execution error:', err);
    process.exit(1);
  }
}

runInsightsTests();
