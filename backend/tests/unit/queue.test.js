const request = require('supertest');
const { app, getTokenForRole, waitForServerReady } = require('../setup');
const { QueueToken } = require('../../models/QueueToken');
const { QueueCounter } = require('../../models/QueueCounter');
const { estimateWait } = require('../../services/queuePredictor');

describe('Unit 3: Smart Queue System', () => {
  let studentToken;
  let staffToken;
  let issuedTokenCode;

  beforeAll(async () => {
    await waitForServerReady();
    studentToken = await getTokenForRole('Student');
    staffToken = await getTokenForRole('Faculty/Staff');

    // Clean up any lingering active tokens for Student in test db
    await QueueToken.deleteMany({ office: 'Accounts Office' });
    await QueueCounter.updateOne(
      { office: 'Accounts Office' },
      {
        $set: {
          code: 'A',
          activeCounters: 2,
          avgServiceDuration: 8,
          lastTokenNumber: 0,
          currentServingToken: null,
        },
      },
      { upsert: true }
    );
  });

  describe('3.1 Token Issuance & Formatting', () => {
    it('Rejects joining queue with an invalid office', async () => {
      const res = await request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ office: 'NonExistentOffice' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Student successfully joins Accounts Office queue and receives A-### token', async () => {
      const res = await request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ office: 'Accounts Office' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.token.tokenCode).toMatch(/^A-\d{3}$/);
      expect(res.body.token.status).toBe('Waiting');
      expect(res.body.peopleAhead).toBe(0);
      expect(res.body.estimatedWait).toBe(0);

      issuedTokenCode = res.body.token.tokenCode;
    });

    it('Duplicate join returns active token without re-issuing duplicate position', async () => {
      const res = await request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ office: 'Accounts Office' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadyActive).toBe(true);
      expect(res.body.token.tokenCode).toBe(issuedTokenCode);
    });
  });

  describe('3.2 Position Calculation & Student Active Status', () => {
    it('GET /api/queues/my-token retrieves active ticket status', async () => {
      const res = await request(app)
        .get('/api/queues/my-token')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasActiveToken).toBe(true);
      expect(res.body.token.tokenCode).toBe(issuedTokenCode);
      expect(res.body.token.status).toBe('Waiting');
      expect(res.body.peopleAhead).toBe(0);
    });
  });

  describe('3.3 Wait-Time Predictor Sane Number Checks', () => {
    it('estimateWait returns 0 when peopleAhead is 0', () => {
      const wait = estimateWait(0, 2, 8);
      expect(wait).toBe(0);
    });

    it('estimateWait returns positive sane estimates across various queue loads', () => {
      // 5 people ahead, 2 counters, 8 min average service time
      const waitA = estimateWait(5, 2, 8, { office: 'Accounts Office', hour: 11 });
      expect(typeof waitA).toBe('number');
      expect(waitA).toBeGreaterThan(0);
      expect(waitA).toBeLessThan(120); // within realistic campus queue bounds

      // 10 people ahead, 1 counter, 6 min average service time
      const waitB = estimateWait(10, 1, 6, { office: 'Examination Cell', hour: 14 });
      expect(typeof waitB).toBe('number');
      expect(waitB).toBeGreaterThan(0);
      expect(waitB).toBeLessThan(200);

      // 20 people ahead, 4 counters, 5 min average service time
      const waitC = estimateWait(20, 4, 5, { office: 'Student Welfare Office', hour: 10 });
      expect(typeof waitC).toBe('number');
      expect(waitC).toBeGreaterThan(0);
      expect(waitC).toBeLessThan(100);
    });
  });

  describe('3.4 Queue Console & Call Next', () => {
    it('Student cannot call next (Role Guard rejection)', async () => {
      const res = await request(app)
        .post('/api/queues/call-next')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ office: 'Accounts Office' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff successfully calls next token in Accounts Office', async () => {
      const res = await request(app)
        .post('/api/queues/call-next')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ office: 'Accounts Office' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.servingToken).toBeDefined();
      expect(res.body.servingToken.tokenCode).toBe(issuedTokenCode);
      expect(res.body.servingToken.status).toBe('Serving');

      // Verify token in DB is now 'Serving'
      const updated = await QueueToken.findOne({ tokenCode: issuedTokenCode });
      expect(updated.status).toBe('Serving');
    });
  });
});
