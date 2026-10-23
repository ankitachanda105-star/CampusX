// backend/tests/unit/auth.test.js
// Unit Test Suite 1: Authentication & Role-Based Access Control (RBAC)
const { app, request, getTokenForRole } = require('../setup');

describe('Unit 1: Authentication & Role Guard Rejection', () => {
  let studentToken;
  let facultyToken;
  let adminToken;
  let superAdminToken;

  beforeAll(async () => {
    studentToken = await getTokenForRole('Student');
    facultyToken = await getTokenForRole('Faculty/Staff');
    adminToken = await getTokenForRole('Admin');
    superAdminToken = await getTokenForRole('Super Admin');
  });

  describe('1.1 Login Credentials & Sanitization', () => {
    test('Student login succeeds with valid registration number', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '12345678', password: 'Student@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('Student');
      expect(res.body.user.password).toBeUndefined();
    });

    test('Faculty login succeeds with employee ID', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'EMP20491', password: 'Faculty@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('Faculty/Staff');
      expect(res.body.user.department).toBe('School of Computer Science & Engineering');
      expect(res.body.user.password).toBeUndefined();
    });

    test('Admin login succeeds with admin registration ID', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ADM10822', password: 'Admin@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('Admin');
      expect(res.body.user.password).toBeUndefined();
    });

    test('Super Admin login succeeds', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'DIR001', password: 'SuperAdmin@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('Super Admin');
      expect(res.body.user.password).toBeUndefined();
    });

    test('Login fails with incorrect password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '12345678', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid credentials/i);
    });

    test('Login fails with non-existent user identifier (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent.user9999@lpu.in', password: 'SomePassword@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/does not exist/i);
    });

    test('Login fails with missing password (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '12345678' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('1.2 JWT Validation (/api/auth/me)', () => {
    test('Valid Bearer token resolves user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.regNo).toBe('12345678');
      expect(res.body.user.password).toBeUndefined();
    });

    test('Missing Authorization header returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Malformed/tampered token returns 403', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_tampered_token_string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('1.3 Role-Guard Rejection for Wrong-Role Access', () => {
    test('Student attempting Faculty/Admin route (/api/resources/book) is rejected with 403', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: '34-215',
          bookingDate: '2026-11-10',
          startTime: '10:00',
          endTime: '12:00',
          eventName: 'Unauthorized Student Booking',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    test('Student attempting Admin route (/api/admin/activity-logs) is rejected with 403', async () => {
      const res = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Faculty attempting Admin route (/api/admin/dashboard) is rejected with 403', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Privilege escalation attempt to register Admin role without Super Admin is rejected with 403', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker User',
          registration_number: 'HACK001',
          email: 'hacker@lpu.in',
          password: 'Password@123',
          role: 'Admin',
          department: 'Hostel Administration',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Privilege escalation blocked/i);
    });
  });
});
