const request = require('supertest');
const { app, getTokenForRole, waitForServerReady } = require('../setup');
const { Complaint } = require('../../models/Complaint');
const { ComplaintUpdate } = require('../../models/ComplaintUpdate');

describe('Unit 2: Complaint Lifecycle & Audit Updates', () => {
  let studentToken;
  let staffToken;
  let adminToken;
  let createdComplaintId;
  let createdComplaintDbId;

  beforeAll(async () => {
    await waitForServerReady();
    studentToken = await getTokenForRole('Student');
    staffToken = await getTokenForRole('Faculty/Staff');
    adminToken = await getTokenForRole('Admin');
  });

  describe('2.1 Complaint Creation & Auto-Classification', () => {
    it('Rejects submission with missing title or short description', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: '',
          description: 'Short',
          block: 'Block 32',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Successfully creates complaint and auto-classifies category & priority', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Projector HDMI port broken in classroom')
        .field('description', 'The projector in Room 32-401 cannot connect to laptop and flashes no signal error continuously.')
        .field('block', 'Block 32')
        .field('roomLab', 'Room 401');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint).toBeDefined();
      expect(res.body.complaint.complaintId).toMatch(/^CX\d+$/);
      expect(res.body.complaint.status).toBe('Assigned');
      expect(res.body.complaint.category).toBeDefined();
      expect(res.body.complaint.priority).toBeDefined();
      expect(res.body.complaint.department).toBeDefined();

      createdComplaintId = res.body.complaint.complaintId;
      createdComplaintDbId = res.body.complaint._id;

      // Assert complaint_updates record was created for initial ticket creation
      const updates = await ComplaintUpdate.find({ complaint: createdComplaintDbId });
      expect(updates.length).toBe(1);
      expect(updates[0].status).toBe('Assigned');
      expect(updates[0].actorRole).toBe('Student');
      expect(updates[0].note).toContain('Auto-classified by AI');
    });
  });

  describe('2.2 Assignment & Reassignment', () => {
    it('Admin can reassign complaint to a different department with audit record', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${createdComplaintId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department: 'IT Services',
          assignedStaffName: 'Er. Rajesh Kumar',
          note: 'Reassigned directly to Lead AV technician.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint.department).toBe('IT Services');
      expect(res.body.complaint.assignedStaffName).toBe('Er. Rajesh Kumar');

      // Assert complaint_updates record was written
      const updates = await ComplaintUpdate.find({ complaint: createdComplaintDbId }).sort({ timestamp: 1 });
      expect(updates.length).toBe(2);
      expect(updates[1].actorRole).toBe('Admin');
      expect(updates[1].note).toContain('Reassigned directly to Lead AV technician');
    });
  });

  describe('2.3 Status Transition: In Progress & Resolve', () => {
    it('Staff updates status to In Progress, recording staff assignment and audit note', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${createdComplaintId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'In Progress',
          note: 'Staff technician dispatched with replacement HDMI transmitter.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint.status).toBe('In Progress');

      const updates = await ComplaintUpdate.find({ complaint: createdComplaintDbId }).sort({ timestamp: 1 });
      expect(updates.length).toBe(3);
      expect(updates[2].status).toBe('In Progress');
      expect(updates[2].note).toContain('Staff technician dispatched');
    });

    it('Staff marks complaint as Resolved with closure notes', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${createdComplaintId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'Resolved',
          note: 'Transmitter replaced and tested with HDMI 2.0 source. Working properly.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint.status).toBe('Resolved');

      // Verify final timeline contains all 4 audit records
      const timelineRes = await request(app)
        .get(`/api/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(timelineRes.status).toBe(200);
      expect(timelineRes.body.complaint.status).toBe('Resolved');
      expect(timelineRes.body.updates.length).toBe(4);
      expect(timelineRes.body.updates[3].status).toBe('Resolved');
      expect(timelineRes.body.updates[3].note).toContain('Transmitter replaced and tested');
    });

    it('Rejects invalid status update transition', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${createdComplaintId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'NonExistentStatus',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
