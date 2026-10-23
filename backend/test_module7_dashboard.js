const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('./models/User');
const { Complaint } = require('./models/Complaint');
const { ServiceRequest } = require('./models/ServiceRequest');
const { QueueToken } = require('./models/QueueToken');
const { QueueCounter } = require('./models/QueueCounter');
const { Resource, seedDefaultResources } = require('./models/Resource');
const { Equipment, seedDefaultEquipment } = require('./models/Equipment');
const { ResourceBooking } = require('./models/ResourceBooking');
const { seedPhase3Bookings } = require('./seed_phase3_bookings');
const adminDashboardRoutes = require('./routes/adminDashboard');

let mongod;
let app;
let server;
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
  console.log('\n--- Starting Automated Tests for Module 7 (Admin Dashboard & Live Metrics) ---');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory test database.\n');

  // Use same JWT secret as auth middleware
  const JWT_SECRET = process.env.JWT_SECRET || 'campusx_jwt_secret_key_secure_2026_salt_987654321';

  // Seed Users across all 4 roles
  const studentUser = await User.create({
    name: 'Alex Kumar',
    regNo: '12345678',
    email: 'alex.12345678@lpu.in',
    password: 'hashed_password',
    role: 'Student',
  });

  const facultyUser = await User.create({
    name: 'Dr. Eleanor Vance',
    regNo: 'EMP20491',
    email: 'eleanor.vance@lpu.in',
    password: 'hashed_password',
    role: 'Faculty/Staff',
    department: 'School of Computer Science & Engineering',
  });

  const adminUser = await User.create({
    name: 'Marcus Ward',
    regNo: 'ADM10822',
    email: 'marcus.admin@lpu.in',
    password: 'hashed_password',
    role: 'Admin',
    department: 'Hostel Administration',
  });

  const superAdminUser = await User.create({
    name: 'Dr. Sarah Jenkins',
    regNo: 'DIR001',
    email: 'sarah.jenkins@lpu.in',
    password: 'hashed_password',
    role: 'Super Admin',
    department: 'Student Welfare',
  });

  // Generate tokens
  const studentToken = jwt.sign({ userId: studentUser._id, role: studentUser.role, email: studentUser.email }, JWT_SECRET);
  const facultyToken = jwt.sign({ userId: facultyUser._id, role: facultyUser.role, email: facultyUser.email }, JWT_SECRET);
  const adminToken = jwt.sign({ userId: adminUser._id, role: adminUser.role, email: adminUser.email }, JWT_SECRET);
  const superAdminToken = jwt.sign({ userId: superAdminUser._id, role: superAdminUser.role, email: superAdminUser.email }, JWT_SECRET);

  // Seed resources, equipment, bookings
  await seedDefaultResources();
  await seedDefaultEquipment();
  await seedPhase3Bookings();

  // Seed complaints
  await Complaint.create([
    {
      complaintId: 'CX3001',
      title: 'Lab 01 projector flickers intermittently',
      description: 'HDMI video feed drops out during artificial intelligence lab practical',
      block: 'Block 34',
      roomLab: 'CSE Lab 01',
      location: 'Block 34, CSE Lab 01',
      category: 'Academic Labs',
      priority: 'High',
      status: 'In Progress',
      submittedBy: studentUser._id,
      studentName: studentUser.name,
      studentEmail: studentUser.email,
      department: 'School of Computer Science & Engineering',
    },
    {
      complaintId: 'CX3002',
      title: 'Broken desk armrest in 32-401',
      description: 'Armrest cracked and wobbles in Row 4 Seat 12',
      block: 'Block 32',
      roomLab: 'Room 401',
      location: 'Block 32, Room 401',
      category: 'Equipment',
      priority: 'Low',
      status: 'Assigned',
      submittedBy: studentUser._id,
      studentName: studentUser.name,
      studentEmail: studentUser.email,
      department: 'Maintenance/Electrical',
    },
    {
      complaintId: 'CX3003',
      title: 'Water filter maintenance in BH-1',
      description: 'Routine filter service completed on second floor dispenser',
      block: 'BH-1',
      roomLab: 'Floor 2',
      location: 'BH-1, Floor 2',
      category: 'Plumbing',
      priority: 'Medium',
      status: 'Resolved',
      submittedBy: studentUser._id,
      studentName: studentUser.name,
      studentEmail: studentUser.email,
      department: 'Hostel Administration',
      updatedAt: new Date(),
    },
  ]);

  // Seed Queue Counters & Tokens
  await QueueCounter.create([
    { office: 'Accounts Office', code: 'A', activeCounters: 3, avgServiceDuration: 8, isActive: true },
    { office: 'Examination Cell', code: 'E', activeCounters: 2, avgServiceDuration: 10, isActive: true },
    { office: 'Student Welfare Office', code: 'S', activeCounters: 2, avgServiceDuration: 6, isActive: true },
  ]);

  await QueueToken.create([
    { tokenCode: 'A-001', tokenNumber: 1, office: 'Accounts Office', student: studentUser._id, studentName: studentUser.name, studentRegNo: studentUser.regNo, status: 'Waiting' },
    { tokenCode: 'A-002', tokenNumber: 2, office: 'Accounts Office', student: studentUser._id, studentName: studentUser.name, studentRegNo: studentUser.regNo, status: 'Waiting' },
    { tokenCode: 'E-001', tokenNumber: 1, office: 'Examination Cell', student: studentUser._id, studentName: studentUser.name, studentRegNo: studentUser.regNo, status: 'Serving' },
  ]);

  // Setup express test server
  app = express();
  app.use(express.json());
  app.use('/api/admin', adminDashboardRoutes);
  server = app.listen(5099);

  // Helper fetch function
  const fetchEndpoint = async (path, token) => {
    const res = await fetch(`http://localhost:5099${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status, data };
  };

  // Test Suite 1: Role-Based Access Control
  console.log('[Test Suite 1: RBAC Route Guards for /api/admin/dashboard]');
  const studentRes = await fetchEndpoint('/api/admin/dashboard', studentToken);
  assert(studentRes.status === 403, `Student access blocked with HTTP 403 Forbidden (got: ${studentRes.status})`);

  const facultyRes = await fetchEndpoint('/api/admin/dashboard', facultyToken);
  assert(facultyRes.status === 403, `Faculty access blocked with HTTP 403 Forbidden (got: ${facultyRes.status})`);

  const adminRes = await fetchEndpoint('/api/admin/dashboard', adminToken);
  assert(adminRes.status === 200, `Admin access permitted with HTTP 200 OK (got: ${adminRes.status})`);

  const superAdminRes = await fetchEndpoint('/api/admin/dashboard', superAdminToken);
  assert(superAdminRes.status === 200, `Super Admin access permitted with HTTP 200 OK (got: ${superAdminRes.status})`);

  // Test Suite 2: Live Metrics Calculation
  console.log('\n[Test Suite 2: Live Metrics Aggregations]');
  const metrics = adminRes.data.metrics;
  assert(metrics.activeComplaints >= 2, `Active complaints count >= 2 (got: ${metrics.activeComplaints})`);
  assert(metrics.resolvedToday >= 1, `Resolved today count >= 1 (got: ${metrics.resolvedToday})`);
  assert(metrics.todayTokensIssued >= 3, `Today tokens issued >= 3 (got: ${metrics.todayTokensIssued})`);
  assert(metrics.currentQueueLoadPercent >= 0 && metrics.currentQueueLoadPercent <= 100, `Queue load % bounded [0, 100] (got: ${metrics.currentQueueLoadPercent}%)`);
  assert(metrics.overallResourceUtilization >= 0 && metrics.overallResourceUtilization <= 100, `Overall resource utilization % bounded [0, 100] (got: ${metrics.overallResourceUtilization}%)`);
  assert(metrics.equipmentAtHighRisk >= 1, `High risk equipment count >= 1 (got: ${metrics.equipmentAtHighRisk})`);

  // Test Suite 3: Recharts Chart Aggregations
  console.log('\n[Test Suite 3: Recharts Visual Chart Aggregations]');
  const charts = adminRes.data.charts;
  assert(Array.isArray(charts.complaintsByDepartment) && charts.complaintsByDepartment.length >= 2, `Complaints by department populated (entries: ${charts.complaintsByDepartment.length})`);
  assert(charts.complaintsByDepartment[0].department !== undefined, 'Department entry has department name');
  assert(charts.complaintsByDepartment[0].active !== undefined, 'Department entry has active count');

  assert(Array.isArray(charts.complaintVolumeTrend), 'Complaint volume trend is an array');
  assert(Array.isArray(charts.complaintStatusBreakdown) && charts.complaintStatusBreakdown.length >= 2, `Complaint status donut chart has slices (slices: ${charts.complaintStatusBreakdown.length})`);

  assert(Array.isArray(charts.resourceUtilizationByBlock) && charts.resourceUtilizationByBlock.length >= 2, `Resource utilization by block populated (blocks: ${charts.resourceUtilizationByBlock.length})`);
  assert(charts.resourceUtilizationByBlock[0].utilization !== undefined, 'Block has numeric utilization percentage');

  // Test Suite 4: Filter Responsiveness
  console.log('\n[Test Suite 4: Filter Responsiveness]');
  const todayFilterRes = await fetchEndpoint('/api/admin/dashboard?timeRange=today', adminToken);
  assert(todayFilterRes.status === 200, 'timeRange=today returns HTTP 200');
  assert(todayFilterRes.data.timeRange === 'today', 'Response reflects timeRange=today');

  const deptFilterRes = await fetchEndpoint('/api/admin/dashboard?department=School%20of%20Computer%20Science%20%26%20Engineering', adminToken);
  assert(deptFilterRes.status === 200, 'department filter returns HTTP 200');
  assert(deptFilterRes.data.metrics.activeComplaints === 1, `Department-filtered active complaints count is 1 (got: ${deptFilterRes.data.metrics.activeComplaints})`);

  // Test Suite 5: Super Admin Governance Section
  console.log('\n[Test Suite 5: Super Admin Governance Dataset]');
  const superAdminData = superAdminRes.data.superAdmin;
  assert(Array.isArray(superAdminData.userRoleSummary), 'userRoleSummary is array');
  assert(superAdminData.userRoleSummary.length >= 4, `All 4 user roles represented in summary (got: ${superAdminData.userRoleSummary.length})`);
  assert(Array.isArray(superAdminData.departmentStaffCount), 'departmentStaffCount is array');
  assert(superAdminData.departmentStaffCount.length >= 1, `Department staff headcount tracked (got: ${superAdminData.departmentStaffCount.length})`);

  console.log('\n=======================================================');
  console.log(` MODULE 7 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=======================================================\n');

  server.close();
  await mongod.stop();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
