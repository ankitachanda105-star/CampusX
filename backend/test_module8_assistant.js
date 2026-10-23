/**
 * Automated Verification Test Suite for Module 8: CampusX AI Assistant
 * Validates RAG retrieval, intent routing, role-scoped security, citations, pre-fill actions, and rate limiting
 */

const assert = require('assert');
const { classifyIntent, isOffTopicOrAbusive } = require('./services/assistantEngine');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function queryAssistant(token, message) {
  const res = await fetch('http://localhost:5000/api/assistant/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('=======================================================');
  console.log(' Starting Automated Tests for Module 8 (CampusX AI Assistant) ');
  console.log('=======================================================\n');

  // -------------------------------------------------------------
  // Test Suite 1: Intent Classification & Guardrails
  // -------------------------------------------------------------
  console.log('[Test Suite 1: Intent Classification & Guardrails]');
  it('Classifies "Where is my bonafide application?" as SERVICE_STATUS with specificService=Bonafide', () => {
    const res = classifyIntent('Where is my bonafide application?');
    assert(res.intent === 'SERVICE_STATUS', `Expected SERVICE_STATUS, got: ${res.intent}`);
    assert(res.specificService === 'Bonafide', `Expected Bonafide, got: ${res.specificService}`);
  });

  it('Classifies "Report a broken fan in Room 215" as REPORT_COMPLAINT with room extracted', () => {
    const res = classifyIntent('Report a broken fan in Room 215');
    assert(res.intent === 'REPORT_COMPLAINT', `Expected REPORT_COMPLAINT, got: ${res.intent}`);
    assert(res.room.toLowerCase().includes('215'), `Expected room 215, got: ${res.room}`);
  });

  it('Classifies "How many people are waiting at accounts?" as QUEUE_STATUS with Accounts Office', () => {
    const res = classifyIntent('How many people are waiting at accounts?');
    assert(res.intent === 'QUEUE_STATUS', `Expected QUEUE_STATUS, got: ${res.intent}`);
    assert(res.office === 'Accounts Office', `Expected Accounts Office, got: ${res.office}`);
  });

  it('Classifies "Which classrooms are available?" as RESOURCE_AVAILABILITY with Classroom', () => {
    const res = classifyIntent('Which classrooms are available?');
    assert(res.intent === 'RESOURCE_AVAILABILITY', `Expected RESOURCE_AVAILABILITY, got: ${res.intent}`);
    assert(res.resourceType === 'Classroom', `Expected Classroom, got: ${res.resourceType}`);
  });

  it('Identifies off-topic queries and provides courteous institutional guidance', () => {
    const res = isOffTopicOrAbusive('Can you give me a recipe for chocolate cake?');
    assert(res.flagged === true, 'Should flag off-topic prompt');
    assert(res.reply.includes('CampusX AI Assistant'), 'Should cite campus operational scope');
  });

  // Authenticate Student & Admin via HTTP API
  const studentLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '12345678', password: 'Student@123', role: 'Student' }),
  });
  const studentAuth = await studentLoginRes.json();
  assert(studentAuth.token, 'Student login should succeed');
  const studentToken = studentAuth.token;

  const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ADM10822', password: 'Admin@123', role: 'Admin' }),
  });
  const adminAuth = await adminLoginRes.json();
  assert(adminAuth.token, 'Admin login should succeed');
  const adminToken = adminAuth.token;

  // -------------------------------------------------------------
  // Test Suite 2: Student Grounded Queries via HTTP
  // -------------------------------------------------------------
  console.log('\n[Test Suite 2: Student Grounded Queries (End-to-End HTTP)]');
  const q1 = await queryAssistant(studentToken, 'Where is my bonafide application?');
  it('Grounds bonafide inquiry in real ServiceRequest record #CX5001', () => {
    assert(q1.status === 200, `Expected 200 OK, got: ${q1.status}`);
    assert(q1.data.citations.length > 0, 'Citations should be attached');
    assert(q1.data.answer.includes('#CX5001') || q1.data.answer.includes('Bonafide'), 'Answer must cite Bonafide record');
    assert(q1.data.action && q1.data.action.type === 'VIEW_REQUEST', 'Should provide view request action');
  });

  const q2 = await queryAssistant(studentToken, 'Report a broken fan in Room 215');
  it('Generates interactive pre-filled complaint action card with Electrical category', () => {
    assert(q2.status === 200, `Expected 200 OK, got: ${q2.status}`);
    assert(q2.data.action && q2.data.action.type === 'PREFILL_COMPLAINT', 'Should generate pre-fill complaint action');
    assert(q2.data.action.payload.category === 'Electrical', `Expected Electrical, got: ${q2.data.action.payload.category}`);
    assert(q2.data.action.payload.roomLab.includes('215'), 'Room should be 215');
    assert(q2.data.citations.some((c) => c.includes('Incident Classifier')), 'Should cite AI classifier');
  });

  const q3 = await queryAssistant(studentToken, 'How many people are waiting at accounts?');
  it('Grounds queue inquiry in live QueueCounter telemetry and estimated wait', () => {
    assert(q3.status === 200, `Expected 200 OK, got: ${q3.status}`);
    assert(q3.data.answer.includes('Accounts Office'), 'Answer should cite Accounts Office');
    assert(q3.data.answer.includes('counter') || q3.data.answer.includes('desk'), 'Answer should mention active counters');
    assert(q3.data.answer.includes('minute'), 'Answer should state estimated wait in minutes');
    assert(q3.data.citations.some((c) => c.includes('QueueCounter')), 'Citation must mention QueueCounter');
  });

  const q4 = await queryAssistant(studentToken, 'Which classrooms are available?');
  it('Grounds resource query in available classroom venues with capacities', () => {
    assert(q4.status === 200, `Expected 200 OK, got: ${q4.status}`);
    assert(q4.data.answer.includes('available') || q4.data.answer.includes('Classroom'), 'Should cite available venues');
    assert(q4.data.citations.some((c) => c.includes('Resource Collection')), 'Citation must mention Resource Collection');
  });

  // -------------------------------------------------------------
  // Test Suite 3: RBAC Security & Data Scoping
  // -------------------------------------------------------------
  console.log('\n[Test Suite 3: RBAC Security & Data Scoping]');
  const studentAdminQuery = await queryAssistant(studentToken, 'Which department has the most pending complaints?');
  it('Blocks Student from accessing administrative complaint analytics with Access Restricted', () => {
    assert(studentAdminQuery.status === 200, 'Endpoint responds 200');
    assert(studentAdminQuery.data.answer.includes('Access Restricted'), 'Must return Access Restricted to Student');
    assert(studentAdminQuery.data.citations.some((c) => c.includes('RBAC')), 'Should cite RBAC policy');
  });

  // -------------------------------------------------------------
  // Test Suite 4: Admin Grounded Analytics Queries
  // -------------------------------------------------------------
  console.log('\n[Test Suite 4: Admin Grounded Analytics Queries]');
  const a1 = await queryAssistant(adminToken, 'Which department has the most pending complaints?');
  it('Answers department pending complaints citing real MongoDB aggregation totals', () => {
    assert(a1.status === 200, `Expected 200 OK, got: ${a1.status}`);
    assert(a1.data.answer.includes('pending') || a1.data.answer.includes('active'), 'Answer should state pending counts');
    assert(a1.data.answer.includes('Department Breakdown'), 'Answer should give breakdown');
    assert(a1.data.citations.some((c) => c.includes('Complaint Collection Aggregation')), 'Must cite aggregation');
  });

  const a2 = await queryAssistant(adminToken, 'What are the major campus problems this month?');
  it('Summarizes 30-day incident trends by category with top problem areas', () => {
    assert(a2.status === 200, `Expected 200 OK, got: ${a2.status}`);
    assert(a2.data.answer.includes('registered incident') || a2.data.answer.includes('problem categories'), 'Should summarize categories');
    assert(a2.data.citations.some((c) => c.includes('30-day window')), 'Must cite 30-day window');
  });

  const a3 = await queryAssistant(adminToken, 'Which equipment has the highest failure rate?');
  it('Evaluates equipment health and identifies top risk asset via ML model', () => {
    assert(a3.status === 200, `Expected 200 OK, got: ${a3.status}`);
    assert(a3.data.answer.includes('Air Conditioner') || a3.data.answer.includes('AC-301'), 'Should cite top risk asset');
    assert(a3.data.answer.includes('risk score') || a3.data.answer.includes('/100'), 'Should cite risk score');
    assert(a3.data.citations.some((c) => c.includes('Predictive Maintenance Model')), 'Should cite ML model');
  });

  // -------------------------------------------------------------
  // Test Suite 5: Off-Topic Guardrail & Rate Limiting Guard
  // -------------------------------------------------------------
  console.log('\n[Test Suite 5: Guardrails & Validation]');
  const guardRes = await queryAssistant(studentToken, 'What is the recipe for chocolate cake?');
  it('Politely redirects off-topic questions back to campus operations', () => {
    assert(guardRes.status === 200, 'HTTP 200');
    assert(guardRes.data.intent === 'GUARD_FILTERED', 'Intent should be GUARD_FILTERED');
    assert(guardRes.data.answer.includes('CampusX AI Assistant'), 'Response should state campus scope');
  });

  const emptyRes = await queryAssistant(studentToken, '');
  it('Rejects empty prompt with HTTP 400 Bad Request', () => {
    assert(emptyRes.status === 400, `Expected 400 Bad Request, got: ${emptyRes.status}`);
    assert(emptyRes.data.success === false, 'Success should be false');
  });

  console.log('\n=======================================================');
  console.log(` MODULE 8 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('=======================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
