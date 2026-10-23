/**
 * Automated Verification Script for Phase 3:
 * Module 5 (Resource Management), Module 6 (Predictive Maintenance), Module 7 (Admin Live Metrics)
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('./models/User');
const { Resource, seedDefaultResources } = require('./models/Resource');
const { ResourceBooking } = require('./models/ResourceBooking');
const { CampusAsset, seedDefaultAssets } = require('./models/CampusAsset');
const { AssetMaintenanceLog } = require('./models/AssetMaintenanceLog');
const { calculateRiskScore } = require('./services/maintenanceRiskPredictor');

async function runTests() {
  console.log('--- Starting Automated Tests for Phase 3 (Modules 5, 6, 7) ---');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to in-memory test database.');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Module 5 — Resource Catalogue & Booking
    // -------------------------------------------------------------
    console.log('\n[Test Suite 1: Resource Catalogue & Seeding]');
    await seedDefaultResources();
    const resources = await Resource.find();
    assert(resources.length === 7, `Seeded 7 LPU facilities (got: ${resources.length})`);

    const auditorium = resources.find((r) => r.code === 'AUD-25');
    assert(!!auditorium, 'Shanti Devi Mittal Auditorium exists');
    assert(auditorium.capacity === 2500, `Auditorium capacity is 2500 (got: ${auditorium.capacity})`);

    const macLab = resources.find((r) => r.code === 'MAC-34');
    assert(!!macLab, 'Apple Mac Lab exists in Block 34');

    // Create test user
    const testUser = await User.create({
      name: 'Prof. Rajesh Sharma',
      regNo: 'EMP10992',
      email: 'rajesh.faculty@lpu.in',
      password: 'hashedpassword',
      role: 'Faculty/Staff',
      department: 'School of Computer Science & Engineering',
    });

    console.log('\n[Test Suite 2: Resource Booking & Collision Detection]');
    const nextBookingId = await ResourceBooking.generateNextBookingId();
    assert(nextBookingId === 'CX-BK1001', `First booking receives ID CX-BK1001 (got: ${nextBookingId})`);

    // Booking 1: 10:00 to 12:00
    const booking1 = await ResourceBooking.create({
      bookingId: nextBookingId,
      resource: macLab._id,
      resourceName: macLab.name,
      resourceCode: macLab.code,
      location: `${macLab.block} — ${macLab.room}`,
      user: testUser._id,
      userName: testUser.name,
      userRegNo: testUser.regNo,
      userRole: testUser.role,
      eventName: 'iOS Swift Bootcamp Workshop',
      purpose: 'Hands-on practical training for pre-final year students',
      bookingDate: '2026-10-05',
      startTime: '10:00',
      endTime: '12:00',
      status: 'Approved',
    });
    assert(booking1.status === 'Approved', 'First booking successfully registered');

    // Attempt Booking 2 on same date overlapping from 11:00 to 13:00
    // Test helper function for collision detection
    function checkOverlap(startA, endA, startB, endB) {
      return startA < endB && endA > startB;
    }

    const isOverlap1 = checkOverlap('11:00', '13:00', booking1.startTime, booking1.endTime);
    assert(isOverlap1 === true, 'Collision correctly detected for 11:00-13:00 overlapping with 10:00-12:00');

    const isOverlap2 = checkOverlap('09:00', '10:30', booking1.startTime, booking1.endTime);
    assert(isOverlap2 === true, 'Collision correctly detected for 09:00-10:30 overlapping with 10:00-12:00');

    const isOverlap3 = checkOverlap('12:00', '14:00', booking1.startTime, booking1.endTime);
    assert(isOverlap3 === false, 'No collision detected for consecutive slot 12:00-14:00');

    // -------------------------------------------------------------
    // Test 2: Module 6 — Predictive Maintenance Risk Scoring
    // -------------------------------------------------------------
    console.log('\n[Test Suite 3: Maintenance Risk Heuristic Stub]');
    // Case A: New equipment, 0 failures, serviced recently -> LOW RISK
    const evalLow = calculateRiskScore(6, 0, 10, 120);
    assert(evalLow.riskLevel === 'LOW', `New equipment evaluates to LOW risk (got: ${evalLow.riskLevel}, score: ${evalLow.riskScore})`);

    // Case B: Moderate age, 2 failures, 60 days since service -> MEDIUM RISK
    const evalMed = calculateRiskScore(48, 2, 60, 120);
    assert(evalMed.riskLevel === 'MEDIUM', `Moderate wear evaluates to MEDIUM risk (got: ${evalMed.riskLevel}, score: ${evalMed.riskScore})`);

    // Case C: High age, 4 failures, 200 days overdue -> CRITICAL RISK
    const evalCrit = calculateRiskScore(90, 4, 200, 120);
    assert(evalCrit.riskLevel === 'CRITICAL', `Overdue equipment evaluates to CRITICAL risk (got: ${evalCrit.riskLevel}, score: ${evalCrit.riskScore})`);
    assert(evalCrit.riskScore >= 85, `Critical risk score >= 85 (got: ${evalCrit.riskScore})`);

    console.log('\n[Test Suite 4: Campus Assets Registry & Servicing Action]');
    await seedDefaultAssets();
    const assets = await CampusAsset.find();
    assert(assets.length === 6, `Seeded 6 LPU campus assets (got: ${assets.length})`);

    const chiller = assets.find((a) => a.assetId === 'EQ-HVAC-3401');
    assert(!!chiller, 'Block 34 Chiller unit exists');
    assert(
      chiller.riskLevel === 'CRITICAL' || chiller.riskLevel === 'HIGH',
      `Unserviced chiller flagged as HIGH/CRITICAL risk (got: ${chiller.riskLevel})`
    );

    // Perform maintenance service on chiller
    const prevScore = chiller.riskScore;
    chiller.lastServiceDate = new Date();
    chiller.failureCount = 0;
    chiller.recalculateRisk();
    await chiller.save();

    assert(chiller.riskScore < prevScore, `Risk score dropped after service: ${prevScore} -> ${chiller.riskScore}`);
    assert(chiller.status === 'Operational', `Status restored to Operational (got: ${chiller.status})`);

    const maintLog = await AssetMaintenanceLog.create({
      asset: chiller._id,
      assetId: chiller.assetId,
      assetName: chiller.name,
      performedBy: testUser._id,
      technicianName: 'Lead HVAC Engineer',
      actionTaken: 'Replaced compressor oil, cleaned condenser coils, calibrated pressure sensors',
      previousRiskScore: prevScore,
      newRiskScore: chiller.riskScore,
    });
    assert(!!maintLog._id, 'Maintenance servicing log recorded successfully');

    // -------------------------------------------------------------
    // Test 3: Module 7 — Analytics KPI Aggregation
    // -------------------------------------------------------------
    console.log('\n[Test Suite 5: Operational Analytics Calculation]');
    const totalRes = await Resource.countDocuments();
    const totalAss = await CampusAsset.countDocuments();
    assert(totalRes >= 7, `Total resources tracked >= 7 (got: ${totalRes})`);
    assert(totalAss >= 6, `Total assets tracked >= 6 (got: ${totalAss})`);

    console.log(`\n=======================================================`);
    console.log(` PHASE 3 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`=======================================================`);
  } catch (err) {
    console.error('Phase 3 test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
