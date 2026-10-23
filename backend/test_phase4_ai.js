/**
 * Automated Verification Test Suite for Phase 4: CampusX AI Layer
 * Tests Python microservice endpoints, Node.js bridges, reason strings, and fallback mechanisms
 */

const assert = require('assert');
const { classifyComplaint } = require('./services/aiClassifier');
const { estimateWait } = require('./services/queuePredictor');
const { calculateRisk } = require('./services/maintenancePredictor');
const { isAIServiceHealthy, postSync } = require('./services/aiClient');

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

async function runTests() {
  console.log('=======================================================');
  console.log(' Starting Automated Tests for Phase 4 (CampusX AI Layer) ');
  console.log('=======================================================\n');

  // Suite 1: Python Microservice Health
  console.log('[Test Suite 1: Python Microservice Health & Connectivity]');
  it('Microservice is reachable and healthy at http://127.0.0.1:8000', () => {
    const isHealthy = isAIServiceHealthy();
    assert(isHealthy === true, 'Python AI microservice should report healthy status');
  });

  it('Direct /classify endpoint predicts valid category and confidence', () => {
    const res = postSync('/classify', {
      title: 'Wi-Fi down in Central Library',
      description: 'Students unable to connect to campus network on reading floor.',
      location: 'Block 13 (Central Library)',
    });
    assert(res && res.success, 'Request to /classify succeeded');
    assert(res.category === 'Network', `Expected category Network, got: ${res.category}`);
    assert(res.department === 'IT Services', `Expected IT Services department, got: ${res.department}`);
    assert(typeof res.confidence === 'number' && res.confidence > 0, 'Confidence must be positive number');
    assert(typeof res.reason === 'string' && res.reason.length > 10, 'Reason string must be populated');
  });

  it('Direct /priority endpoint handles high-density location properly', () => {
    const res = postSync('/priority', {
      category: 'Electrical',
      location: 'Block 25 (Auditorium & Administration)',
      affected_users: 500,
      complaint_text: 'Stage electrical switch sparking near curtains',
    });
    assert(res && res.success, 'Request to /priority succeeded');
    assert(res.priority === 'Critical' || res.priority === 'High', `Expected Critical/High, got: ${res.priority}`);
    assert(res.is_hazard === true, 'Hazard should be detected from spark keyword');
  });

  it('Direct /queue-wait endpoint computes wait time with rush-hour factor', () => {
    const res = postSync('/queue-wait', {
      people_ahead: 8,
      active_counters: 2,
      avg_service_time_minutes: 8.0,
      time_of_day_hour: 12,
      office_type: 'Accounts Office',
    });
    assert(res && res.success, 'Request to /queue-wait succeeded');
    assert(res.estimated_wait_minutes > 0, `Expected positive wait time, got: ${res.estimated_wait_minutes}`);
    assert(res.reason.includes('Accounts Office'), 'Reason should cite office location');
  });

  it('Direct /maintenance-risk endpoint scores overdue equipment with high risk', () => {
    const res = postSync('/maintenance-risk', {
      equipment_age_days: 1200,
      failures_last_90_days: 4,
      days_since_last_maintenance: 220,
      usage_category: 'Heavy Duty',
      equipment_type: 'Air Conditioner',
    });
    assert(res && res.success, 'Request to /maintenance-risk succeeded');
    assert(res.risk_score >= 70, `Expected risk score >= 70, got: ${res.risk_score}`);
    assert(res.risk_level === 'HIGH', `Expected HIGH risk level, got: ${res.risk_level}`);
    assert(typeof res.reason === 'string' && res.reason.includes('HIGH RISK'), 'Reason must include HIGH RISK');
  });

  // Suite 2: Node.js Bridge — aiClassifier.js
  console.log('\n[Test Suite 2: Node.js Bridge — aiClassifier.js]');
  it('Classifies electrical hazard as Electrical + Critical + Maintenance/Electrical', () => {
    const result = classifyComplaint(
      'Burning smell and sparks from switchboard',
      'Electrical short circuit sparking in lecture hall.',
      'Block 34 - Room 215'
    );
    assert(result.category === 'Electrical', `Expected Electrical, got: ${result.category}`);
    assert(result.priority === 'Critical', `Expected Critical priority, got: ${result.priority}`);
    assert(result.department === 'Maintenance/Electrical', `Expected Maintenance/Electrical, got: ${result.department}`);
    assert(result.isAI === true, 'Should be flagged as isAI = true');
    assert(typeof result.reason === 'string', 'Reason should be provided');
  });

  it('Classifies CSE lab coding terminal issue as Academic Labs + CSE Dept', () => {
    const result = classifyComplaint(
      'GCC compiler environment broken on CSE Lab 01',
      'Students unable to compile coursework on Linux terminals.',
      'Block 34 - CSE Lab 01'
    );
    assert(result.category === 'Academic Labs', `Expected Academic Labs, got: ${result.category}`);
    assert(result.department === 'School of Computer Science & Engineering', `Got: ${result.department}`);
    assert(result.isAI === true, 'isAI flag must be true');
  });

  it('Classifies plumbing issue in BH-4 washroom as Plumbing', () => {
    const result = classifyComplaint(
      'Leaking tap in washroom',
      'Water continuously flowing and splashing on floor.',
      'BH-4 - 1st Floor Washroom'
    );
    assert(result.category === 'Plumbing', `Expected Plumbing, got: ${result.category}`);
    assert(result.department === 'Maintenance/Electrical', `Got: ${result.department}`);
    assert(result.isAI === true, 'isAI flag must be true');
  });

  it('Classifies broken furniture in seminar hall as Civil', () => {
    const result = classifyComplaint(
      'Broken chair in seminar hall',
      'Armrest and back support fractured with sharp metal edge.',
      'Block 32 - Acoustic Seminar Hall'
    );
    assert(result.category === 'Civil', `Expected Civil, got: ${result.category}`);
    assert(result.department === 'Maintenance/Electrical', `Got: ${result.department}`);
  });

  // Suite 3: Node.js Bridge — queuePredictor.js
  console.log('\n[Test Suite 3: Node.js Bridge — queuePredictor.js]');
  it('Returns 0 minutes for empty queue', () => {
    const wait = estimateWait(0, 2, 8);
    assert(wait === 0, `Expected 0 minutes, got: ${wait}`);
  });

  it('Returns ML predicted wait time for active queue', () => {
    const wait = estimateWait(6, 2, 8, { office: 'Accounts Office', hour: 11 });
    assert(typeof wait === 'number' && wait > 0, `Expected positive wait, got: ${wait}`);
    assert(estimateWait.lastIsAI === true, 'Should be flagged as lastIsAI = true');
    assert(typeof estimateWait.lastReason === 'string', 'Should attach lastReason');
  });

  // Suite 4: Node.js Bridge — maintenancePredictor.js
  console.log('\n[Test Suite 4: Node.js Bridge — maintenancePredictor.js]');
  it('Evaluates high-risk equipment with failures as HIGH risk via ML', () => {
    const now = Date.now();
    const highRiskEq = {
      type: 'Air Conditioner',
      last_maintenance_date: new Date(now - 200 * 86400000),
      install_date: new Date(now - 1000 * 86400000),
      failure_history: [
        { date: new Date(now - 10 * 86400000) },
        { date: new Date(now - 30 * 86400000) },
        { date: new Date(now - 50 * 86400000) },
      ],
    };
    const evalResult = calculateRisk(highRiskEq);
    assert(evalResult.riskScore >= 70, `Expected riskScore >= 70, got: ${evalResult.riskScore}`);
    assert(evalResult.riskLevel === 'HIGH', `Expected HIGH, got: ${evalResult.riskLevel}`);
    assert(evalResult.isAI === true, 'Expected isAI = true');
    assert(evalResult.reason.includes('HIGH RISK'), 'Reason should articulate HIGH RISK assessment');
  });

  it('Evaluates recently serviced fan as LOW risk via ML', () => {
    const now = Date.now();
    const lowRiskEq = {
      type: 'Ceiling Fan',
      last_maintenance_date: new Date(now - 10 * 86400000),
      install_date: new Date(now - 200 * 86400000),
      failure_history: [],
    };
    const evalResult = calculateRisk(lowRiskEq);
    assert(evalResult.riskScore < 40, `Expected riskScore < 40, got: ${evalResult.riskScore}`);
    assert(evalResult.riskLevel === 'LOW', `Expected LOW, got: ${evalResult.riskLevel}`);
    assert(evalResult.isAI === true, 'Expected isAI = true');
  });

  // Suite 5: Fallback Resilience
  console.log('\n[Test Suite 5: Resilient Fallback When AI Service Standby]');
  it('Falls back gracefully to rule-based classification if offline', () => {
    const originalUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:9999'; // deliberately offline port
    try {
      const fallbackResult = classifyComplaint(
        'Hostel room lock jammed',
        'Key not turning in BH-2 room 304.',
        'BH-2 - Room 304'
      );
      assert(fallbackResult.category === 'Hostel', `Expected Hostel, got: ${fallbackResult.category}`);
      assert(fallbackResult.department === 'Hostel Administration', `Got: ${fallbackResult.department}`);
      assert(fallbackResult.isAI === false, 'isAI flag must be false in fallback mode');
      assert(fallbackResult.reason.includes('Rule-based'), 'Reason must indicate rule-based fallback');
    } finally {
      process.env.AI_SERVICE_URL = originalUrl;
    }
  });

  it('Falls back gracefully to queue formula if offline', () => {
    const originalUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:9999';
    try {
      const wait = estimateWait(6, 2, 10);
      assert(wait === 30, `Expected fallback formula 30, got: ${wait}`);
      assert(estimateWait.lastIsAI === false, 'lastIsAI flag must be false in fallback mode');
    } finally {
      process.env.AI_SERVICE_URL = originalUrl;
    }
  });

  it('Falls back gracefully to maintenance formula if offline', () => {
    const originalUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:9999';
    try {
      const now = Date.now();
      const eq = {
        type: 'Air Conditioner',
        last_maintenance_date: new Date(now - 190 * 86400000),
        install_date: new Date(now - 800 * 86400000),
        failure_history: [
          { date: new Date(now - 10 * 86400000) },
          { date: new Date(now - 30 * 86400000) },
          { date: new Date(now - 50 * 86400000) },
        ],
      };
      const fallbackRisk = calculateRisk(eq);
      assert(fallbackRisk.riskScore >= 70, `Expected riskScore >= 70 in fallback, got: ${fallbackRisk.riskScore}`);
      assert(fallbackRisk.isAI === false, 'isAI flag must be false in fallback mode');
      assert(fallbackRisk.reason.includes('Heuristic fallback'), 'Reason should indicate heuristic fallback');
    } finally {
      process.env.AI_SERVICE_URL = originalUrl;
    }
  });

  console.log('\n=======================================================');
  console.log(` PHASE 4 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('=======================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
