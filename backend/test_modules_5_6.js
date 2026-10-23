const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Resource, seedDefaultResources } = require('./models/Resource');
const { Equipment, seedDefaultEquipment } = require('./models/Equipment');
const { ResourceBooking } = require('./models/ResourceBooking');
const { User } = require('./models/User');
const { calculateRisk } = require('./services/maintenancePredictor');
const { seedPhase3Bookings } = require('./seed_phase3_bookings');

let mongod;
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

async function runTests() {
  console.log('\n--- Starting Automated Tests for Phase 3 (Modules 5 & 6) ---');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory test database.\n');

  // 1. Seed test users
  const faculty = await User.create({
    name: 'Dr. Eleanor Vance',
    regNo: 'EMP20491',
    email: 'eleanor.vance@lpu.in',
    password: 'hashed_password',
    role: 'Faculty/Staff',
    department: 'School of Computer Science & Engineering',
  });

  // 2. Test Suite 1: Resource Master Data Seeding
  console.log('[Test Suite 1: Resource Master Data]');
  await seedDefaultResources();
  const allResources = await Resource.find();
  assert(allResources.length >= 10, `Seeded at least 10 LPU resources (found: ${allResources.length})`);

  const r32_401 = await Resource.findOne({ resource_id: '32-401' });
  assert(r32_401 !== null, 'Classroom 32-401 seeded');
  assert(r32_401 && r32_401.capacity === 80, `Classroom 32-401 capacity is 80 (got: ${r32_401?.capacity})`);

  const r34_215 = await Resource.findOne({ resource_id: '34-215' });
  assert(r34_215 !== null, 'Classroom 34-215 seeded');

  const lab01 = await Resource.findOne({ resource_id: 'CSE-LAB-01' });
  assert(lab01 !== null, 'CSE Lab 01 seeded');
  assert(lab01 && lab01.systemCount === 60, `CSE Lab 01 has 60 computer systems (got: ${lab01?.systemCount})`);

  const lab06 = await Resource.findOne({ resource_id: 'CSE-LAB-06' });
  assert(lab06 !== null, 'CSE Lab 06 seeded');

  const aud25 = await Resource.findOne({ resource_id: 'AUD-25' });
  assert(aud25 && aud25.capacity === 2500, `Auditorium capacity is 2500 (got: ${aud25?.capacity})`);

  const sport55 = await Resource.findOne({ resource_id: 'SPORT-55' });
  assert(sport55 && sport55.type === 'Sports Facility', 'Indoor Badminton Arena is Sports Facility');

  // 3. Test Suite 2: Equipment Inventory Linked to Resources
  console.log('\n[Test Suite 2: Equipment Inventory Linked to Resources]');
  await seedDefaultEquipment();
  const allEquipment = await Equipment.find().populate('parent_resource');
  assert(allEquipment.length >= 7, `Seeded at least 7 equipment assets (found: ${allEquipment.length})`);

  const p101 = await Equipment.findOne({ equipment_id: 'P-101' }).populate('parent_resource');
  assert(p101 !== null, 'Projector P-101 exists');
  assert(p101 && p101.parent_resource.resource_id === '34-215', `P-101 linked to parent resource 34-215 (got: ${p101?.parent_resource?.resource_id})`);
  assert(p101 && p101.failure_history.length >= 2, `P-101 has historical failure logs (count: ${p101?.failure_history?.length})`);

  const ac301 = await Equipment.findOne({ equipment_id: 'AC-301' });
  assert(ac301 !== null, 'Air Conditioner AC-301 exists');
  assert(ac301 && ac301.type === 'Air Conditioner', 'AC-301 type is Air Conditioner');

  // 4. Test Suite 3: Faculty Booking & Collision Prevention
  console.log('\n[Test Suite 3: Faculty Booking & Conflict Prevention]');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Booking 1: 10:00 to 12:00
  const b1 = new ResourceBooking({
    bookingId: await ResourceBooking.generateNextBookingId(),
    resource: r32_401._id,
    resourceName: r32_401.name,
    resourceCode: r32_401.resource_id,
    location: `${r32_401.block} (${r32_401.type})`,
    user: faculty._id,
    userName: faculty.name,
    userRegNo: faculty.regNo,
    userRole: faculty.role,
    eventName: 'Data Structures Lecture',
    purpose: 'Academic Session',
    bookingDate: tomorrow,
    startTime: '10:00',
    endTime: '12:00',
    status: 'Confirmed',
  });
  await b1.save();
  assert(b1.bookingId.startsWith('CX-BK'), `First booking generated ID: ${b1.bookingId}`);

  // Test collision check: overlapping slot 11:00 to 13:00 on same resource & date
  const collision1 = await ResourceBooking.findOne({
    resource: r32_401._id,
    bookingDate: tomorrow,
    status: { $in: ['Confirmed', 'Approved'] },
    $expr: {
      $and: [
        { $lt: ['$startTime', '13:00'] },
        { $gt: ['$endTime', '11:00'] },
      ],
    },
  });
  assert(collision1 !== null, 'Slot 11:00-13:00 correctly collides with 10:00-12:00');

  // Test collision check: overlapping slot 09:30 to 10:30
  const collision2 = await ResourceBooking.findOne({
    resource: r32_401._id,
    bookingDate: tomorrow,
    status: { $in: ['Confirmed', 'Approved'] },
    $expr: {
      $and: [
        { $lt: ['$startTime', '10:30'] },
        { $gt: ['$endTime', '09:30'] },
      ],
    },
  });
  assert(collision2 !== null, 'Slot 09:30-10:30 correctly collides with 10:00-12:00');

  // Non-overlapping consecutive slot: 12:00 to 14:00
  const collision3 = await ResourceBooking.findOne({
    resource: r32_401._id,
    bookingDate: tomorrow,
    status: { $in: ['Confirmed', 'Approved'] },
    $expr: {
      $and: [
        { $lt: ['$startTime', '14:00'] },
        { $gt: ['$endTime', '12:00'] },
      ],
    },
  });
  assert(collision3 === null, 'Consecutive slot 12:00-14:00 has NO collision');

  // 5. Test Suite 4: 30-Day Utilization Calculation
  console.log('\n[Test Suite 4: 30-Day Utilization Calculation]');
  await seedPhase3Bookings();
  const bookingsPast30Days = await ResourceBooking.find({
    status: { $in: ['Confirmed', 'Approved', 'Completed'] },
  });
  assert(bookingsPast30Days.length >= 10, `Found ${bookingsPast30Days.length} bookings for utilization tracking`);

  // 6. Test Suite 5: Maintenance Risk Prediction Stub
  console.log('\n[Test Suite 5: Maintenance Risk Heuristic Stub]');
  const p101Fresh = await Equipment.findOne({ equipment_id: 'P-101' });
  const p101Risk = calculateRisk(p101Fresh);
  assert(p101Risk.riskScore >= 0 && p101Risk.riskScore <= 100, `P-101 risk score is within 0-100 (got: ${p101Risk.riskScore})`);
  assert(['LOW', 'MEDIUM', 'HIGH'].includes(p101Risk.riskLevel), `P-101 assigned valid risk level: ${p101Risk.riskLevel}`);

  const ac301Fresh = await Equipment.findOne({ equipment_id: 'AC-301' });
  const ac301Risk = calculateRisk(ac301Fresh);
  assert(ac301Risk.riskScore >= 70, `AC-301 with 190 days overdue and 3 failures flagged as HIGH risk (got: ${ac301Risk.riskScore}, level: ${ac301Risk.riskLevel})`);
  assert(ac301Risk.riskLevel === 'HIGH', 'AC-301 riskLevel is HIGH');

  const pc501Fresh = await Equipment.findOne({ equipment_id: 'PC-501' });
  const pc501Risk = calculateRisk(pc501Fresh);
  assert(pc501Risk.riskLevel === 'LOW', `Recently serviced PC-501 flagged as LOW risk (got: ${pc501Risk.riskLevel}, score: ${pc501Risk.riskScore})`);

  // 7. Test Suite 6: Maintenance Servicing Reset
  console.log('\n[Test Suite 6: Maintenance Servicing Action]');
  const preServiceScore = ac301Risk.riskScore;
  ac301Fresh.last_maintenance_date = new Date(); // Servicing completed today
  ac301Fresh.status = 'Operational';
  await ac301Fresh.save();

  const postServiceRisk = calculateRisk(ac301Fresh);
  assert(postServiceRisk.riskScore < preServiceScore, `Servicing dropped risk score: ${preServiceScore} -> ${postServiceRisk.riskScore}`);
  assert(postServiceRisk.daysSinceLastMaintenance === 0, 'Days since last maintenance reset to 0');

  // 8. Test Suite 7: Manual Failure Logging
  console.log('\n[Test Suite 7: Manual Failure Logging]');
  pc501Fresh.failure_history.push({
    date: new Date(),
    complaintId: 'MAN-9901',
    issue: 'SSD Read/Write I/O throughput degradation',
    loggedBy: 'Admin Technician',
  });
  await pc501Fresh.save();
  const updatedPC501Risk = calculateRisk(pc501Fresh);
  assert(updatedPC501Risk.failureCount90Days === 1, `Logged failure recognized in 90-day window (count: ${updatedPC501Risk.failureCount90Days})`);

  console.log('\n=======================================================');
  console.log(` PHASE 3 (MOD 5 & 6) TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=======================================================\n');

  await mongod.stop();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
