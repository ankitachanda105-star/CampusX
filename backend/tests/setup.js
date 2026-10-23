// backend/tests/setup.js
// Shared test configuration and helper utilities for Jest + Supertest
process.env.PORT = '0'; // Ephemeral port to prevent collision with running daemon
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');

let cachedTokens = {};

async function getTokenForRole(role) {
  if (cachedTokens[role]) return cachedTokens[role];

  let email, password;
  if (role === 'Student') {
    email = '12345678';
    password = 'Student@123';
  } else if (role === 'Faculty/Staff') {
    email = 'EMP20491';
    password = 'Faculty@123';
  } else if (role === 'Admin') {
    email = 'ADM10822';
    password = 'Admin@123';
  } else if (role === 'Super Admin') {
    email = 'DIR001';
    password = 'SuperAdmin@123';
  }

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  const token = res.body.token || res.body.data?.token;
  if (!token) {
    throw new Error(`Failed to authenticate ${role}: ${JSON.stringify(res.body)}`);
  }
  cachedTokens[role] = token;
  return token;
}

// Ensure database connection and startup seeding are ready before running tests
async function waitForServerReady() {
  const mongoose = require('mongoose');
  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 40) {
    await new Promise((r) => setTimeout(r, 150));
    attempts++;
  }
  // Wait until users collection is populated
  const { User } = require('../models/User');
  attempts = 0;
  while (attempts < 40) {
    const userCount = await User.countDocuments();
    if (userCount >= 4) break;
    await new Promise((r) => setTimeout(r, 150));
    attempts++;
  }

  // Wait until final seedData completion (CX5002) so no background async seeding runs during tests
  const { ServiceRequest } = require('../models/ServiceRequest');
  attempts = 0;
  while (attempts < 50) {
    const finalSeed = await ServiceRequest.findOne({ requestId: 'CX5002' });
    if (finalSeed) break;
    await new Promise((r) => setTimeout(r, 150));
    attempts++;
  }
}

beforeAll(async () => {
  await waitForServerReady();
});

module.exports = {
  app,
  request,
  getTokenForRole,
  waitForServerReady,
};
