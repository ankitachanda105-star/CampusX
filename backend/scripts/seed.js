const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { User } = require('../models/User');

const SEED_USERS = [
  {
    name: 'Alex Kumar',
    regNo: '12345678',
    email: 'alex.12345678@lpu.in',
    password: 'Student@123',
    role: 'Student',
    department: null,
  },
  {
    name: 'Dr. Eleanor Vance',
    regNo: 'EMP20491',
    email: 'eleanor.vance@lpu.in',
    password: 'Faculty@123',
    role: 'Faculty/Staff',
    department: 'School of Computer Science & Engineering',
  },
  {
    name: 'Marcus Ward',
    regNo: 'ADM10822',
    email: 'marcus.admin@lpu.in',
    password: 'Admin@123',
    role: 'Admin',
    department: 'Hostel Administration',
  },
  {
    name: 'Dr. Sarah Jenkins',
    regNo: 'DIR001',
    email: 'sarah.jenkins@lpu.in',
    password: 'SuperAdmin@123',
    role: 'Super Admin',
    department: 'Student Welfare',
  },
];

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusx';
  try {
    console.log(`Connecting to MongoDB at: ${uri}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to local/external MongoDB.');
  } catch (err) {
    console.log('Local MongoDB not reachable. Spinning up embedded MongoMemoryServer for seed...');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`Connected to MongoMemoryServer at: ${memUri}`);
  }
}

async function seed() {
  await connectDB();

  console.log('\n=============================================');
  console.log('   CAMPUSX — LOVELY PROFESSIONAL UNIVERSITY   ');
  console.log('          USER SEEDING (LPU ACCOUNTS)         ');
  console.log('=============================================\n');

  for (const user of SEED_USERS) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);

    await User.findOneAndUpdate(
      { email: user.email },
      {
        name: user.name,
        regNo: user.regNo,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        department: user.department,
      },
      { upsert: true, new: true }
    );

    console.log(`✓ Seeded [${user.role}]:`);
    console.log(`    Name:       ${user.name}`);
    console.log(`    Reg/Emp ID: ${user.regNo}`);
    console.log(`    Email:      ${user.email}`);
    console.log(`    Password:   ${user.password}`);
    console.log(`    Department: ${user.department || 'None'}\n`);
  }

  console.log('LPU test users seeded successfully!\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
