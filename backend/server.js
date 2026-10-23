const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const campusConfig = require('./config/campus');
const { User } = require('./models/User');
const { seedDefaultServices } = require('./models/ServiceCatalogue');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const complaintsRoutes = require('./routes/complaints');
const queuesRoutes = require('./routes/queues');
const servicesRoutes = require('./routes/services');
const notificationsRoutes = require('./routes/notifications');
const resourcesRoutes = require('./routes/resources');
const maintenanceRoutes = require('./routes/maintenance');
const analyticsRoutes = require('./routes/analytics');
const adminDashboardRoutes = require('./routes/adminDashboard');
const assistantRoutes = require('./routes/assistant');
const activityLogsRoutes = require('./routes/activityLogs');
const { seedDefaultResources } = require('./models/Resource');
const { seedDefaultAssets } = require('./models/CampusAsset');
const { seedDefaultEquipment } = require('./models/Equipment');
const { seedPhase3Bookings } = require('./seed_phase3_bookings');
const { seedDemoDashboardComplaints } = require('./seed_demo_complaints');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (complaint photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logger for development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Campus Master Config API
app.get('/api/campus/config', (req, res) => {
  res.status(200).json({
    success: true,
    campus: campusConfig,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', protectedRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/queues', queuesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/activity-logs', activityLogsRoutes);
app.use('/api/assistant', assistantRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    university: campusConfig.university.name,
    location: campusConfig.university.location,
    modules: [
      'Module 1: Auth & Roles',
      'Module 2: Smart Complaint Management',
      'Module 3: Smart Queue',
      'Module 4: College Service Hub',
      'Module 5: Resource Management',
      'Module 6: Predictive Maintenance',
      'Module 7: Admin Live Metrics',
      'Module 8: CampusX AI Assistant',
    ],
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static build in production environments (Render unified deployment)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Seed default LPU accounts
async function autoSeedUsers() {
  const seedUsers = [
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

  for (const u of seedUsers) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(u.password, salt);
    await User.findOneAndUpdate(
      { email: u.email },
      {
        name: u.name,
        regNo: u.regNo,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        department: u.department,
      },
      { upsert: true, new: true }
    );
  }
  console.log('LPU test accounts verified and updated.');
}

// Database Connection with resilient fallback
async function startServer() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusx';
  try {
    console.log(`Attempting MongoDB connection at: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log('Connected to MongoDB database.');
  } catch (err) {
    console.warn('Local MongoDB daemon not accessible. Starting embedded in-memory MongoDB...');
    try {
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`Connected to in-memory MongoDB at: ${memUri}`);
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }

  await autoSeedUsers();
  await seedDefaultServices();
  await seedDefaultResources();
  await seedDefaultEquipment();
  await seedPhase3Bookings();
  await seedDefaultAssets();
  await seedDemoDashboardComplaints();
  const { seedData } = require('./seed_modules_3_4_data');
  await seedData();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` CampusX — Lovely Professional University (Phagwara)   `);
    console.log(` Backend running on port ${PORT}                        `);
    console.log(` Phase 1, 2 (M2-M4) & Phase 3 (M5-M7) APIs Mounted     `);
    console.log(`=======================================================`);
  });
}

startServer();

module.exports = app;
