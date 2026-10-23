const mongoose = require('mongoose');

const ServiceRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalogue',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    serviceCode: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentRegNo: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    documentUrl: {
      type: String,
      default: null,
    },
    documentOriginalName: {
      type: String,
      default: null,
    },
    stages: {
      type: [String],
      default: [
        'Submitted',
        'Document Verified',
        'Department Approval',
        'HOD Approval',
        'Certificate Generated',
      ],
    },
    currentStageIndex: {
      type: Number,
      default: 0,
    },
    currentStage: {
      type: String,
      default: 'Submitted',
    },
    status: {
      type: String,
      enum: ['In Progress', 'Completed', 'Rejected'],
      default: 'In Progress',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvalHistory: [
      {
        stage: { type: String, required: true },
        action: { type: String, enum: ['Submitted', 'Approved', 'Rejected'], required: true },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorName: { type: String, required: true },
        actorRole: { type: String, required: true },
        remark: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper function to generate sequential CX#### IDs for service requests
ServiceRequestSchema.statics.generateNextRequestId = async function () {
  const lastRequest = await this.findOne({ requestId: { $regex: /^CX5\d{3}$/ } })
    .sort({ requestId: -1 })
    .select('requestId');

  if (!lastRequest || !lastRequest.requestId) {
    return 'CX5001';
  }

  const numPart = parseInt(lastRequest.requestId.replace('CX', ''), 10);
  const nextNum = isNaN(numPart) ? 5001 : numPart + 1;
  return `CX${nextNum}`;
};

const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);

module.exports = {
  ServiceRequest,
};
