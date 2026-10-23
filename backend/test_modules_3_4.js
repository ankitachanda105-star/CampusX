/**
 * Automated Verification Script for Phase 2:
 * Module 3 (Smart Queue) & Module 4 (College Service Hub)
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('./models/User');
const { QueueCounter } = require('./models/QueueCounter');
const { QueueToken } = require('./models/QueueToken');
const { Notification } = require('./models/Notification');
const { ServiceCatalogue, seedDefaultServices } = require('./models/ServiceCatalogue');
const { ServiceRequest } = require('./models/ServiceRequest');
const { estimateWait } = require('./services/queuePredictor');

async function runTests() {
  console.log('--- Starting Automated Tests for Modules 3 & 4 ---');
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
    // Test 1: Queue Wait Time Predictor Stub
    // -------------------------------------------------------------
    console.log('\n[Test Suite 1: Queue Predictor Service]');
    const wait1 = estimateWait(6, 2, 10); // (6 * 10) / 2 = 30
    assert(wait1 === 30, `estimateWait(6, 2, 10) returns 30 (got: ${wait1})`);

    const wait2 = estimateWait(0, 2, 8); // 0 wait
    assert(wait2 === 0, `estimateWait(0, 2, 8) returns 0 (got: ${wait2})`);

    const wait3 = estimateWait(5, 3, 7); // (5 * 7) / 3 = 11.66 -> 12
    assert(wait3 === 12, `estimateWait(5, 3, 7) rounds correctly to 12 (got: ${wait3})`);

    // -------------------------------------------------------------
    // Test 2: Service Catalogue Seeding
    // -------------------------------------------------------------
    console.log('\n[Test Suite 2: Service Catalogue Seeding]');
    await seedDefaultServices();
    const services = await ServiceCatalogue.find();
    assert(services.length === 7, `Seeded exactly 7 LPU services (got: ${services.length})`);

    const bonafide = services.find((s) => s.code === 'BONAFIDE_CERT');
    assert(!!bonafide, 'Bonafide Certificate service exists');
    assert(
      bonafide.stages.length === 5 &&
      bonafide.stages[0] === 'Submitted' &&
      bonafide.stages[4] === 'Certificate Generated',
      'Bonafide Certificate has all 5 ordered approval stages'
    );
    assert(
      bonafide.requiredDocuments.length >= 2,
      'Bonafide Certificate lists required documents checklist'
    );

    // -------------------------------------------------------------
    // Test 3: Module 3 (Smart Queue Flow)
    // -------------------------------------------------------------
    console.log('\n[Test Suite 3: Smart Queue Flow & Token Issuance]');
    // Create counter for Accounts Office
    const accountsCounter = await QueueCounter.create({
      office: 'Accounts Office',
      code: 'A',
      activeCounters: 2,
      avgServiceDuration: 8,
    });

    // Create 4 test student users
    const studentUsers = [];
    for (let i = 1; i <= 4; i++) {
      const u = await User.create({
        name: `Student Test ${i}`,
        regNo: `1200000${i}`,
        email: `student${i}@lpu.in`,
        password: 'hashedpassword',
        role: 'Student',
      });
      studentUsers.push(u);
    }

    // Student 1 joins queue
    accountsCounter.lastTokenNumber += 1;
    await accountsCounter.save();
    const token1 = await QueueToken.create({
      tokenCode: `A-${String(accountsCounter.lastTokenNumber).padStart(3, '0')}`,
      tokenNumber: accountsCounter.lastTokenNumber,
      office: 'Accounts Office',
      student: studentUsers[0]._id,
      studentName: studentUsers[0].name,
      studentRegNo: studentUsers[0].regNo,
      status: 'Waiting',
    });
    assert(token1.tokenCode === 'A-001', `First student receives token A-001 (got: ${token1.tokenCode})`);

    // Student 2 joins queue
    accountsCounter.lastTokenNumber += 1;
    await accountsCounter.save();
    const token2 = await QueueToken.create({
      tokenCode: `A-${String(accountsCounter.lastTokenNumber).padStart(3, '0')}`,
      tokenNumber: accountsCounter.lastTokenNumber,
      office: 'Accounts Office',
      student: studentUsers[1]._id,
      studentName: studentUsers[1].name,
      studentRegNo: studentUsers[1].regNo,
      status: 'Waiting',
    });
    assert(token2.tokenCode === 'A-002', `Second student receives token A-002 (got: ${token2.tokenCode})`);

    // People ahead of Student 2
    const peopleAheadStudent2 = await QueueToken.countDocuments({
      office: 'Accounts Office',
      status: 'Waiting',
      tokenNumber: { $lt: token2.tokenNumber },
    });
    assert(peopleAheadStudent2 === 1, `Student 2 has 1 person ahead in queue (got: ${peopleAheadStudent2})`);

    // Admin calls next token
    // Token 1 moves to Serving
    token1.status = 'Serving';
    token1.servedAt = new Date();
    await token1.save();
    accountsCounter.currentServingToken = token1.tokenCode;
    accountsCounter.currentServingNumber = token1.tokenNumber;
    await accountsCounter.save();

    assert(
      accountsCounter.currentServingToken === 'A-001',
      `Counter now actively serves A-001 (got: ${accountsCounter.currentServingToken})`
    );

    // Students 3 and 4 join queue
    for (let i = 2; i < 4; i++) {
      accountsCounter.lastTokenNumber += 1;
      await accountsCounter.save();
      await QueueToken.create({
        tokenCode: `A-${String(accountsCounter.lastTokenNumber).padStart(3, '0')}`,
        tokenNumber: accountsCounter.lastTokenNumber,
        office: 'Accounts Office',
        student: studentUsers[i]._id,
        studentName: studentUsers[i].name,
        studentRegNo: studentUsers[i].regNo,
        status: 'Waiting',
      });
    }

    // Now call next again: Token 1 completed, Token 2 starts serving
    token1.status = 'Completed';
    token1.completedAt = new Date();
    await token1.save();

    token2.status = 'Serving';
    token2.servedAt = new Date();
    await token2.save();
    accountsCounter.currentServingToken = token2.tokenCode;
    accountsCounter.currentServingNumber = token2.tokenNumber;
    await accountsCounter.save();

    // Check remaining waiting tokens and proximity notification trigger (within 3 positions)
    const remainingWaiting = await QueueToken.find({
      office: 'Accounts Office',
      status: 'Waiting',
    }).sort({ tokenNumber: 1 });

    assert(remainingWaiting.length === 2, `2 students waiting (A-003 and A-004)`);

    for (let i = 0; i < Math.min(3, remainingWaiting.length); i++) {
      const t = remainingWaiting[i];
      if (!t.notificationSent) {
        await Notification.create({
          user: t.student,
          type: 'QUEUE_ALERT',
          title: `Queue Alert — Accounts Office`,
          message: `You are position #${i + 1} in queue for token ${t.tokenCode}.`,
        });
        t.notificationSent = true;
        await t.save();
      }
    }

    const notifications = await Notification.find({ type: 'QUEUE_ALERT' });
    assert(notifications.length === 2, `Proximity notifications created for students within 3 positions (got: ${notifications.length})`);

    // -------------------------------------------------------------
    // Test 4: Module 4 (College Service Hub Flow)
    // -------------------------------------------------------------
    console.log('\n[Test Suite 4: College Service Hub & Stepper Lifecycle]');
    const nextReqId = await ServiceRequest.generateNextRequestId();
    assert(nextReqId === 'CX5001', `First service request receives ID CX5001 (got: ${nextReqId})`);

    // Student submits request
    const req1 = await ServiceRequest.create({
      requestId: nextReqId,
      service: bonafide._id,
      serviceName: bonafide.name,
      serviceCode: bonafide.code,
      department: bonafide.department,
      student: studentUsers[0]._id,
      studentName: studentUsers[0].name,
      studentRegNo: studentUsers[0].regNo,
      studentEmail: studentUsers[0].email,
      purpose: 'Applying for national educational loan',
      documentUrl: '/uploads/documents/doc-test.pdf',
      documentOriginalName: 'id_proof.pdf',
      stages: bonafide.stages,
      currentStageIndex: 0,
      currentStage: 'Submitted',
      status: 'In Progress',
      approvalHistory: [
        {
          stage: 'Submitted',
          action: 'Submitted',
          actor: studentUsers[0]._id,
          actorName: studentUsers[0].name,
          actorRole: 'Student',
          remark: 'Applied online with fee receipt attached.',
        },
      ],
    });

    assert(req1.currentStage === 'Submitted', 'Initial request stage is Submitted');
    assert(req1.currentStageIndex === 0, 'Initial request stage index is 0');

    // Stage 1: Document Verified
    req1.currentStageIndex = 1;
    req1.currentStage = req1.stages[1];
    req1.approvalHistory.push({
      stage: 'Submitted',
      action: 'Approved',
      actorName: 'Verification Officer',
      actorRole: 'Faculty/Staff',
      remark: 'All ID cards and fee slips verified.',
      timestamp: new Date(),
    });
    await req1.save();
    assert(req1.currentStage === 'Document Verified', 'Advanced to Stage 1: Document Verified');

    // Stage 2: Department Approval
    req1.currentStageIndex = 2;
    req1.currentStage = req1.stages[2];
    req1.approvalHistory.push({
      stage: 'Document Verified',
      action: 'Approved',
      actorName: 'Department Admin',
      actorRole: 'Faculty/Staff',
      remark: 'Course registration confirmed.',
      timestamp: new Date(),
    });
    await req1.save();
    assert(req1.currentStage === 'Department Approval', 'Advanced to Stage 2: Department Approval');

    // Stage 3: HOD Approval
    req1.currentStageIndex = 3;
    req1.currentStage = req1.stages[3];
    req1.approvalHistory.push({
      stage: 'Department Approval',
      action: 'Approved',
      actorName: 'Head of Department',
      actorRole: 'Faculty/Staff',
      remark: 'Approved by HOD office.',
      timestamp: new Date(),
    });
    await req1.save();
    assert(req1.currentStage === 'HOD Approval', 'Advanced to Stage 3: HOD Approval');

    // Stage 4: Certificate Generated (Completion)
    req1.currentStageIndex = 4;
    req1.currentStage = req1.stages[4];
    req1.status = 'Completed';
    req1.approvalHistory.push({
      stage: 'HOD Approval',
      action: 'Approved',
      actorName: 'Registrar Staff',
      actorRole: 'Admin',
      remark: 'Digital certificate issued with QR verification.',
      timestamp: new Date(),
    });
    await req1.save();
    assert(req1.currentStage === 'Certificate Generated', 'Advanced to Stage 4: Certificate Generated');
    assert(req1.status === 'Completed', 'Final status marked as Completed');
    assert(req1.approvalHistory.length === 5, 'Complete audit history preserved across all stages');

    // Test rejection flow
    const nextReqId2 = await ServiceRequest.generateNextRequestId();
    assert(nextReqId2 === 'CX5002', `Second service request receives sequential ID CX5002 (got: ${nextReqId2})`);

    const req2 = await ServiceRequest.create({
      requestId: nextReqId2,
      service: bonafide._id,
      serviceName: bonafide.name,
      serviceCode: bonafide.code,
      department: bonafide.department,
      student: studentUsers[1]._id,
      studentName: studentUsers[1].name,
      studentRegNo: studentUsers[1].regNo,
      studentEmail: studentUsers[1].email,
      purpose: 'Passport application',
      stages: bonafide.stages,
      currentStageIndex: 0,
      currentStage: 'Submitted',
      status: 'In Progress',
    });

    // Rejection at stage 0
    req2.status = 'Rejected';
    req2.rejectionReason = 'Attached fee receipt is expired. Please submit current semester slip.';
    req2.approvalHistory.push({
      stage: 'Submitted',
      action: 'Rejected',
      actorName: 'Verification Officer',
      actorRole: 'Faculty/Staff',
      remark: req2.rejectionReason,
      timestamp: new Date(),
    });
    await req2.save();

    assert(req2.status === 'Rejected', 'Rejected request status marked as Rejected');
    assert(
      req2.rejectionReason.includes('expired'),
      'Rejection reason properly captured for student visibility'
    );

    console.log(`\n=======================================================`);
    console.log(` TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`=======================================================`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
