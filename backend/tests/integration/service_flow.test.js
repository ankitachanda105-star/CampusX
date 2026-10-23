const request = require('supertest');
const { app, getTokenForRole, waitForServerReady } = require('../setup');
const { ServiceCatalogue, seedDefaultServices } = require('../../models/ServiceCatalogue');
const { ActivityLog } = require('../../models/ActivityLog');

describe('Integration 9: Full End-to-End Service Request Stepper Progression & Activity Audit', () => {
  let studentToken;
  let staffToken;
  let serviceId;
  let createdRequestId;
  let createdRequestCode;

  beforeAll(async () => {
    await waitForServerReady();
    studentToken = await getTokenForRole('Student');
    staffToken = await getTokenForRole('Faculty/Staff');

    await seedDefaultServices();
    const service = await ServiceCatalogue.findOne({ name: /Bonafide/i });
    serviceId = service._id.toString();
  });

  it('Executes full 5-stage stepper progression and records audit logs at each milestone', async () => {
    // 1. Student submits application
    const submitRes = await request(app)
      .post('/api/services/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('serviceId', serviceId)
      .field('purpose', 'End-to-end integration test application for bonafide verification.');

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.success).toBe(true);
    const reqData = submitRes.body.request;
    createdRequestId = reqData._id;
    createdRequestCode = reqData.requestId;

    expect(reqData.currentStageIndex).toBe(0);
    expect(reqData.currentStage).toBe('Submitted');
    expect(reqData.status).toBe('In Progress');

    // Assert initial submission activity log
    const submitLog = await ActivityLog.findOne({
      target: `ServiceRequest #${createdRequestCode}`,
      action: 'SERVICE_REQUEST',
    });
    expect(submitLog).toBeDefined();

    // Stepper review transitions
    const stageTransitions = [
      {
        expectedStageBefore: 'Submitted',
        expectedIndexAfter: 1,
        expectedStageAfter: 'Document Verified',
        remark: 'Scanned ID and enrollment verified against UMS records.',
      },
      {
        expectedStageBefore: 'Document Verified',
        expectedIndexAfter: 2,
        expectedStageAfter: 'Department Approval',
        remark: 'Department attendance requirements cleared.',
      },
      {
        expectedStageBefore: 'Department Approval',
        expectedIndexAfter: 3,
        expectedStageAfter: 'HOD Approval',
        remark: 'Head of Department formal endorsement granted.',
      },
      {
        expectedStageBefore: 'HOD Approval',
        expectedIndexAfter: 4,
        expectedStageAfter: 'Certificate Generated',
        remark: 'Head of Department formal endorsement granted.',
      },
      {
        expectedStageBefore: 'Certificate Generated',
        expectedIndexAfter: 4,
        expectedStageAfter: 'Certificate Generated',
        remark: 'Official digital certificate generated, stamped, and ready.',
      },
    ];

    for (let i = 0; i < stageTransitions.length; i++) {
      const step = stageTransitions[i];

      const reviewRes = await request(app)
        .post(`/api/services/${createdRequestId}/review`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          action: 'Approved',
          remark: step.remark,
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.success).toBe(true);

      const updated = reviewRes.body.request;
      expect(updated.currentStageIndex).toBe(step.expectedIndexAfter);
      expect(updated.currentStage).toBe(step.expectedStageAfter);

      if (i === stageTransitions.length - 1) {
        expect(updated.status).toBe('Completed');
      } else {
        expect(updated.status).toBe('In Progress');
      }

      // Assert that ActivityLog was written for this stage approval
      const auditLog = await ActivityLog.findOne({
        target: `ServiceRequest #${createdRequestCode}`,
        action: 'SERVICE_APPROVE',
        details: new RegExp(step.expectedStageBefore, 'i'),
      });
      expect(auditLog).toBeDefined();
    }

    // Student views final completed certificate request
    const finalRes = await request(app)
      .get(`/api/services/${createdRequestId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(finalRes.status).toBe(200);
    expect(finalRes.body.request.status).toBe('Completed');
    expect(finalRes.body.request.currentStageIndex).toBe(4);
    expect(finalRes.body.request.approvalHistory.length).toBe(6);
  });
});
