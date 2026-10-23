const request = require('supertest');
const { app, getTokenForRole, waitForServerReady } = require('../setup');
const { Equipment } = require('../../models/Equipment');
const { Complaint } = require('../../models/Complaint');

describe('Integration 8: Full End-to-End Complaint Lifecycle & AI Insights Repeated Failure', () => {
  let studentToken;
  let staffToken;
  let adminToken;

  beforeAll(async () => {
    await waitForServerReady();
    studentToken = await getTokenForRole('Student');
    staffToken = await getTokenForRole('Faculty/Staff');
    adminToken = await getTokenForRole('Admin');

    // Clear prior failure history specifically for P-101 to ensure exact 3x test
    await Equipment.updateOne(
      { equipment_id: 'P-101' },
      { $set: { failure_history: [], status: 'Operational' } }
    );
  });

  it(
    'Executes 3 complete complaint lifecycles on equipment P-101 and triggers AI repeated failure insight',
    async () => {
    const issues = [
      {
        title: 'Projector P-101 lamp bulb flickering in Room 32-401',
        desc: 'The projector P-101 bulb keeps flickering and dims completely every few minutes during class.',
      },
      {
        title: 'Projector P-101 HDMI signal loss in Room 32-401',
        desc: 'Digital video signal on projector P-101 cuts out intermittently when connecting laptop.',
      },
      {
        title: 'Projector P-101 power failure and overheating in Room 32-401',
        desc: 'Projector P-101 shut down automatically due to thermal overload warning in Room 32-401.',
      },
    ];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];

      // 1. Student submits complaint
      const submitRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', issue.title)
        .field('description', issue.desc)
        .field('block', 'Block 32')
        .field('roomLab', 'Room 401');

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.success).toBe(true);
      const complaint = submitRes.body.complaint;
      expect(complaint.category).toBeDefined();
      expect(complaint.status).toBe('Assigned');

      // 2. Staff updates status to In Progress
      const progressRes = await request(app)
        .patch(`/api/complaints/${complaint.complaintId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'In Progress',
          note: `Technician assigned for incident cycle ${i + 1}.`,
        });
      expect(progressRes.status).toBe(200);

      // 3. Staff resolves complaint
      const resolveRes = await request(app)
        .patch(`/api/complaints/${complaint.complaintId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'Resolved',
          note: `Servicing completed for incident cycle ${i + 1}. Tested operational.`,
        });
      expect(resolveRes.status).toBe(200);

      // 4. Student verifies resolution
      const checkRes = await request(app)
        .get(`/api/complaints/${complaint.complaintId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.complaint.status).toBe('Resolved');

      // 5. Admin links resolved incident report into equipment failure history
      const logRes = await request(app)
        .post('/api/maintenance/equipment/P-101/failures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          issue: issue.title,
          complaintId: complaint.complaintId,
        });
      expect(logRes.status).toBe(201);
      expect(logRes.body.success).toBe(true);
    }

    // Verify P-101 now has 3 failure history entries
    const p101 = await Equipment.findOne({ equipment_id: 'P-101' });
    expect(p101).toBeDefined();
    expect(p101.failure_history.length).toBeGreaterThanOrEqual(3);

    // 6. Admin fetches Dashboard and verifies AI Insights panel surfaces Repeated Failure flag
    const dashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(Array.isArray(dashRes.body.insights)).toBe(true);

    const repeatedFailureInsight = dashRes.body.insights.find(
      (ins) => ins.id === 'repeated-failure-P-101'
    );

    expect(repeatedFailureInsight).toBeDefined();
    expect(repeatedFailureInsight.category).toBe('REPEATED_FAILURE');
    expect(repeatedFailureInsight.targetId).toBe('P-101');
    expect(repeatedFailureInsight.severity).toBe('CRITICAL');
    expect(repeatedFailureInsight.title).toContain('P-101');
  }, 35000);
});
