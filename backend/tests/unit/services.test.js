const request = require('supertest');
const { app, getTokenForRole, waitForServerReady } = require('../setup');
const { ServiceCatalogue, seedDefaultServices } = require('../../models/ServiceCatalogue');
const { ServiceRequest } = require('../../models/ServiceRequest');

describe('Unit 4: College Service Hub', () => {
  let studentToken;
  let staffToken;
  let serviceId;
  let activeRequestId;
  let rejectRequestId;

  beforeAll(async () => {
    await waitForServerReady();
    studentToken = await getTokenForRole('Student');
    staffToken = await getTokenForRole('Faculty/Staff');

    await seedDefaultServices();
    const service = await ServiceCatalogue.findOne({ name: /Bonafide/i });
    serviceId = service._id.toString();
  });

  describe('4.1 Catalogue & Request Submission', () => {
    it('GET /api/services/catalogue returns active LPU service list', async () => {
      const res = await request(app)
        .get('/api/services/catalogue')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.services)).toBe(true);
      expect(res.body.services.length).toBeGreaterThan(0);
    });

    it('Rejects submission with missing purpose', async () => {
      const res = await request(app)
        .post('/api/services/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          serviceId,
          purpose: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Student successfully submits a Bonafide Certificate request', async () => {
      const res = await request(app)
        .post('/api/services/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('serviceId', serviceId)
        .field('purpose', 'Required for state education scholarship application verification.');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.requestId).toMatch(/^CX\d+$/);
      expect(res.body.request.status).toBe('In Progress');
      expect(res.body.request.currentStage).toBe('Submitted');
      expect(res.body.request.currentStageIndex).toBe(0);

      activeRequestId = res.body.request._id;
    });
  });

  describe('4.2 Stage Progression through Stepper', () => {
    it('Student cannot review/approve their own request (Role Guard rejection)', async () => {
      const res = await request(app)
        .post(`/api/services/${activeRequestId}/review`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ action: 'Approved', remark: 'Self approval attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff approves stage 0 (Submitted) -> advances to stage 1 (Document Verified)', async () => {
      const res = await request(app)
        .post(`/api/services/${activeRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'Approved', remark: 'Initial application documents reviewed.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('In Progress');
      expect(res.body.request.currentStageIndex).toBe(1);
      expect(res.body.request.currentStage).toBe('Document Verified');
      expect(res.body.request.approvalHistory.length).toBe(2);
      expect(res.body.request.approvalHistory[1].action).toBe('Approved');
    });

    it('Staff approves stage 1 (Document Verification) -> advances to stage 2 (Department Approval)', async () => {
      const res = await request(app)
        .post(`/api/services/${activeRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'Approved', remark: 'Student records and fee clearance confirmed.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.currentStageIndex).toBe(2);
      expect(res.body.request.currentStage).toBe('Department Approval');
      expect(res.body.request.approvalHistory.length).toBe(3);
      expect(res.body.request.approvalHistory[2].action).toBe('Approved');
    });
  });

  describe('4.3 Rejection Path with Mandatory Remark', () => {
    beforeAll(async () => {
      // Create a second request to test rejection path
      const res = await request(app)
        .post('/api/services/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('serviceId', serviceId)
        .field('purpose', 'Need railway concession certificate for travel.');

      rejectRequestId = res.body.request._id;
    });

    it('Rejects review attempt without required remark when rejecting', async () => {
      const res = await request(app)
        .post(`/api/services/${rejectRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'Rejected', remark: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('rejection reason/remark is mandatory');
    });

    it('Staff successfully rejects request with valid remark', async () => {
      const res = await request(app)
        .post(`/api/services/${rejectRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          action: 'Rejected',
          remark: 'Invalid travel dates provided; exceeds maximum semester vacation window.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('Rejected');
      expect(res.body.request.rejectionReason).toContain('Invalid travel dates provided');

      const history = res.body.request.approvalHistory;
      expect(history[history.length - 1].action).toBe('Rejected');
    });

    it('Subsequent review on already rejected request is blocked', async () => {
      const res = await request(app)
        .post(`/api/services/${rejectRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'Approved', remark: 'Trying to reopen' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already rejected');
    });
  });
});
