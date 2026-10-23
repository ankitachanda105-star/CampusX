const mongoose = require('mongoose');

const ACTIVITY_ACTIONS = [
  'LOGIN',
  'REGISTER',
  'ROLE_CHANGE',
  'COMPLAINT_SUBMIT',
  'COMPLAINT_REASSIGN',
  'COMPLAINT_STATUS_UPDATE',
  'SERVICE_REQUEST',
  'SERVICE_APPROVE',
  'SERVICE_REJECT',
  'MAINTENANCE_SCHEDULE',
  'MAINTENANCE_CERTIFY',
  'FAILURE_LOG',
  'RESOURCE_CREATE',
  'RESOURCE_UPDATE',
  'RESOURCE_DELETE',
  'QUEUE_CALL_NEXT',
];

const ActivityLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
    trim: true,
  },
  userRole: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: ACTIVITY_ACTIONS,
    index: true,
  },
  target_resource: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  details: {
    type: String,
    default: '',
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = {
  ActivityLog: mongoose.model('ActivityLog', ActivityLogSchema),
  ACTIVITY_ACTIONS,
};
