const request = require('supertest');
const { app, ready, getTokenForRole } = require('../setup');
const { Resource, seedDefaultResources } = require('../../models/Resource');
const { ResourceBooking } = require('../../models/ResourceBooking');

describe('Unit 5: Smart Resource Management & Conflict Prevention', () => {
  let facultyToken;
  let studentToken;
  let adminToken;
  const testDate = '2026-10-25';

  beforeAll(async () => {
    facultyToken = await getTokenForRole('Faculty/Staff');
    studentToken = await getTokenForRole('Student');
    adminToken = await getTokenForRole('Admin');

    // Wait for server background seeding to complete
    let attempts = 0;
    while (attempts < 25) {
      const count = await ResourceBooking.countDocuments();
      if (count >= 5) break;
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }
    // Small cooldown to ensure last async batch completes
    await new Promise((r) => setTimeout(r, 800));

    // Clear bookings for clean sequential unit test execution
    await ResourceBooking.deleteMany({});
    await seedDefaultResources();
  });

  describe('5.1 Role & Validation Guardrails', () => {
    it('Student cannot book resources (Role Guard rejection)', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '09:00',
          endTime: '11:00',
          eventName: 'Student Club Gathering',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Rejects invalid time window where startTime is after or equal to endTime', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '14:00',
          endTime: '12:00',
          eventName: 'Backwards Timeline Meeting',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Start time must be strictly earlier than end time');
    });

    it('Rejects reservation attempt on Under Maintenance resource', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          resourceId: 'SPORT-56',
          bookingDate: testDate,
          startTime: '10:00',
          endTime: '11:00',
          eventName: 'Swimming Competition',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message.toLowerCase()).toContain('under maintenance');
    });
  });

  describe('5.2 Booking Success and Overlap Collision Prevention', () => {
    it('Faculty reserves AUD-25 for slot 10:00 to 12:00', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '10:00',
          endTime: '12:00',
          eventName: 'Annual AI & Robotics Conference',
          purpose: 'Department symposium featuring external keynote speakers.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.bookingId).toMatch(/^CX-BK\d+$/);
      expect(res.body.booking.status).toBe('Confirmed');
    });

    it('Colliding slot attempt (11:00 to 13:00) is rejected with 409 conflict & collision details', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '11:00',
          endTime: '13:00',
          eventName: 'Cultural Dance Society Rehearsal',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Booking Conflict');
      expect(res.body.collision).toBeDefined();
      expect(res.body.collision.eventName).toBe('Annual AI & Robotics Conference');
      expect(res.body.collision.startTime).toBe('10:00');
      expect(res.body.collision.endTime).toBe('12:00');
    });

    it('Enclosed sub-slot attempt (10:30 to 11:30) is also rejected as conflict', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '10:30',
          endTime: '11:30',
          eventName: 'Quick Team Briefing',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Booking Conflict');
    });

    it('Non-overlapping slot (14:00 to 16:00) on same day is successfully confirmed', async () => {
      const res = await request(app)
        .post('/api/resources/book')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          resourceId: 'AUD-25',
          bookingDate: testDate,
          startTime: '14:00',
          endTime: '16:00',
          eventName: 'Faculty Senate Meeting',
          purpose: 'Quarterly academic curriculum review.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.startTime).toBe('14:00');
      expect(res.body.booking.endTime).toBe('16:00');
    });
  });
});
