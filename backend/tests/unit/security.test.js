const request = require('supertest');
const { app, ready, getTokenForRole } = require('../setup');

describe('Unit 7: Security Hardening & Input Bounds', () => {
  let studentToken;

  beforeAll(async () => {
    studentToken = await getTokenForRole('Student');
  });

  describe('7.1 Unauthenticated Access Protection', () => {
    it('Rejects unauthenticated request to /api/complaints with 401', async () => {
      const res = await request(app).get('/api/complaints/my');
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Rejects unauthenticated request to /api/admin/dashboard with 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Rejects unauthenticated request to /api/queues/join with 401', async () => {
      const res = await request(app)
        .post('/api/queues/join')
        .send({ office: 'Accounts Office' });
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('Rejects unauthenticated request to /api/services/catalogue with 401', async () => {
      const res = await request(app).get('/api/services/catalogue');
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('7.2 Malicious & Executable File Upload Rejection', () => {
    it('Rejects .exe executable upload on complaints with security violation message', async () => {
      const fakeExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Testing malicious executable upload')
        .field('description', 'Attempting to attach a binary executable file to ticket.')
        .field('block', 'Block 32')
        .attach('image', fakeExecutable, { filename: 'malware.exe', contentType: 'application/x-msdownload' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message.toLowerCase()).toMatch(/security violation|strictly prohibited|invalid file type/);
    });

    it('Rejects .sh script upload on service hub document attachments', async () => {
      const fakeScript = Buffer.from('#!/bin/bash\nrm -rf /');
      const res = await request(app)
        .post('/api/services/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('serviceId', '600000000000000000000001')
        .field('purpose', 'Attempting script payload submission.')
        .attach('document', fakeScript, { filename: 'payload.sh', contentType: 'application/x-sh' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message.toLowerCase()).toMatch(/security violation|strictly prohibited|invalid file type/);
    });

    it('Rejects .php web shell upload on complaints', async () => {
      const fakePhp = Buffer.from('<?php system($_GET["cmd"]); ?>');
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Testing php file rejection')
        .field('description', 'Attempting web shell upload via multipart form.')
        .field('block', 'Block 34')
        .attach('image', fakePhp, { filename: 'shell.php', contentType: 'application/x-php' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message.toLowerCase()).toMatch(/security violation|strictly prohibited|invalid file type/);
    });
  });

  describe('7.3 Oversized File Rejection (> 5MB Limit)', () => {
    it('Rejects file upload exceeding 5MB on complaints endpoint', async () => {
      // 5.5 MB dummy buffer
      const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'A');
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Oversized photo of broken equipment')
        .field('description', 'Attached raw high-resolution image exceeding 5 megabytes.')
        .field('block', 'Block 32')
        .attach('image', oversizedBuffer, { filename: 'heavy_photo.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('7.4 Input Bounds Validation', () => {
    it('Rejects complaint title shorter than 3 characters', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'AC')
        .field('description', 'Air conditioner is not working at all.')
        .field('block', 'Block 32');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Complaint title must be between 3 and 150 characters');
    });

    it('Rejects complaint description shorter than 10 characters', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Broken projector ceiling bracket')
        .field('description', 'Broken!')
        .field('block', 'Block 32');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Description must be between 10 and 2000 characters');
    });

    it('Rejects service request with purpose shorter than 10 characters', async () => {
      const res = await request(app)
        .post('/api/services/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          serviceId: '600000000000000000000001',
          purpose: 'Need it',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('purpose must be between 10 and 1000 characters');
    });
  });
});
