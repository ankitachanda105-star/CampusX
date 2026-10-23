const mongoose = require('mongoose');
const { User } = require('./models/User');
const { QueueCounter } = require('./models/QueueCounter');
const { QueueToken } = require('./models/QueueToken');
const { Notification } = require('./models/Notification');
const { ServiceCatalogue, seedDefaultServices } = require('./models/ServiceCatalogue');
const { ServiceRequest } = require('./models/ServiceRequest');

async function seedData() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusx';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
  } catch (err) {
    console.log('Using in-memory/direct connection if already connected.');
  }

  // Ensure services catalogue
  await seedDefaultServices();

  const student = await User.findOne({ email: 'alex.12345678@lpu.in' });
  const faculty = await User.findOne({ email: 'eleanor.vance@lpu.in' });
  const admin = await User.findOne({ email: 'marcus.admin@lpu.in' });

  if (!student) {
    console.log('Student not found, skipping specific seeding.');
    return;
  }

  // 1. Setup Accounts Office Counter
  let accountsCounter = await QueueCounter.findOne({ office: 'Accounts Office' });
  if (!accountsCounter) {
    accountsCounter = new QueueCounter({
      office: 'Accounts Office',
      code: 'A',
      activeCounters: 2,
      avgServiceDuration: 8,
    });
  }
  accountsCounter.activeCounters = 2;
  accountsCounter.avgServiceDuration = 8;
  accountsCounter.lastTokenNumber = 4;
  accountsCounter.currentServingToken = 'A-001';
  accountsCounter.currentServingNumber = 1;
  await accountsCounter.save();

  // 2. Setup Tokens for Accounts Office
  await QueueToken.deleteMany({ office: 'Accounts Office' });

  // Token 1: Serving
  await QueueToken.create({
    tokenCode: 'A-001',
    tokenNumber: 1,
    office: 'Accounts Office',
    student: admin ? admin._id : student._id,
    studentName: 'Rohan Sharma',
    studentRegNo: '12104592',
    status: 'Serving',
    servedAt: new Date(Date.now() - 4 * 60000),
  });

  // Token 2: Waiting
  await QueueToken.create({
    tokenCode: 'A-002',
    tokenNumber: 2,
    office: 'Accounts Office',
    student: faculty ? faculty._id : student._id,
    studentName: 'Priya Verma',
    studentRegNo: '12108841',
    status: 'Waiting',
    createdAt: new Date(Date.now() - 15 * 60000),
    notificationSent: true,
  });

  // Token 3: Waiting
  await QueueToken.create({
    tokenCode: 'A-003',
    tokenNumber: 3,
    office: 'Accounts Office',
    student: admin ? admin._id : student._id,
    studentName: 'Gurpreet Singh',
    studentRegNo: '12219033',
    status: 'Waiting',
    createdAt: new Date(Date.now() - 10 * 60000),
    notificationSent: true,
  });

  // Token 4: Waiting (Alex Kumar - student)
  await QueueToken.create({
    tokenCode: 'A-004',
    tokenNumber: 4,
    office: 'Accounts Office',
    student: student._id,
    studentName: student.name,
    studentRegNo: student.regNo,
    status: 'Waiting',
    createdAt: new Date(Date.now() - 5 * 60000),
    notificationSent: true,
  });

  // In-app Notification for Alex Kumar
  await Notification.create({
    user: student._id,
    type: 'QUEUE_ALERT',
    title: 'Queue Alert — Accounts Office',
    message: 'Hurry up! You are now position #3 in queue (2 people ahead) for token A-004 at Accounts Office. Please head toward the desk.',
    metadata: { tokenCode: 'A-004', office: 'Accounts Office', positionsAway: 3 },
  });

  // 3. Setup Service Request for Alex Kumar
  await ServiceRequest.deleteMany({ student: student._id });

  const bonafide = await ServiceCatalogue.findOne({ code: 'BONAFIDE_CERT' });
  if (bonafide) {
    await ServiceRequest.create({
      requestId: 'CX5001',
      service: bonafide._id,
      serviceName: bonafide.name,
      serviceCode: bonafide.code,
      department: bonafide.department,
      student: student._id,
      studentName: student.name,
      studentRegNo: student.regNo,
      studentEmail: student.email,
      purpose: 'Applying for national educational scholarship and visa verification.',
      documentUrl: '/uploads/documents/sample_id_proof.pdf',
      documentOriginalName: 'lpu_student_id_and_feeslip.pdf',
      stages: bonafide.stages,
      currentStageIndex: 2, // 'Department Approval'
      currentStage: 'Department Approval',
      status: 'In Progress',
      approvalHistory: [
        {
          stage: 'Submitted',
          action: 'Submitted',
          actor: student._id,
          actorName: student.name,
          actorRole: 'Student',
          remark: 'Application submitted online with ID card copy attached.',
          timestamp: new Date(Date.now() - 2 * 86400000),
        },
        {
          stage: 'Document Verified',
          action: 'Approved',
          actor: faculty ? faculty._id : student._id,
          actorName: 'Dr. Eleanor Vance',
          actorRole: 'Faculty/Staff',
          remark: 'Valid semester fees and enrollment credentials verified against university records.',
          timestamp: new Date(Date.now() - 1 * 86400000),
        },
      ],
    });

    // Also seed a second request showing completed certificate
    const transcript = await ServiceCatalogue.findOne({ code: 'TRANSCRIPT_REQ' });
    if (transcript) {
      await ServiceRequest.create({
        requestId: 'CX5002',
        service: transcript._id,
        serviceName: transcript.name,
        serviceCode: transcript.code,
        department: transcript.department,
        student: student._id,
        studentName: student.name,
        studentRegNo: student.regNo,
        studentEmail: student.email,
        purpose: 'Higher education transfer application.',
        stages: transcript.stages,
        currentStageIndex: 4,
        currentStage: 'Certificate Generated',
        status: 'Completed',
        approvalHistory: [
          {
            stage: 'Submitted',
            action: 'Submitted',
            actorName: student.name,
            actorRole: 'Student',
            remark: 'Transcript application submitted.',
            timestamp: new Date(Date.now() - 5 * 86400000),
          },
          {
            stage: 'Document Verified',
            action: 'Approved',
            actorName: 'Registrar Evaluation Desk',
            actorRole: 'Faculty/Staff',
            remark: 'Grade sheets verified.',
            timestamp: new Date(Date.now() - 4 * 86400000),
          },
          {
            stage: 'Department Approval',
            action: 'Approved',
            actorName: 'School of CSE Admin',
            actorRole: 'Faculty/Staff',
            remark: 'Credits clearance confirmed.',
            timestamp: new Date(Date.now() - 3 * 86400000),
          },
          {
            stage: 'HOD Approval',
            action: 'Approved',
            actorName: 'Head of Department',
            actorRole: 'Faculty/Staff',
            remark: 'Endorsed by HOD.',
            timestamp: new Date(Date.now() - 2 * 86400000),
          },
          {
            stage: 'Certificate Generated',
            action: 'Approved',
            actorName: 'Examination Cell Superintendent',
            actorRole: 'Admin',
            remark: 'Official transcript stamped and issued.',
            timestamp: new Date(Date.now() - 1 * 86400000),
          },
        ],
      });
    }
  }

  console.log('Seeded Modules 3 & 4 demo queue and service records successfully.');
}

module.exports = { seedData };

if (require.main === module) {
  seedData().then(() => {
    mongoose.disconnect();
  });
}
