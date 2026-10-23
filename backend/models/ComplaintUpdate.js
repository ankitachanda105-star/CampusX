const mongoose = require('mongoose');

const complaintUpdateSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
    index: true,
  },
  complaintId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['Submitted', 'Assigned', 'In Progress', 'Resolved'],
    required: true,
  },
  note: {
    type: String,
    default: '',
    trim: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  actorName: {
    type: String,
    required: true,
  },
  actorRole: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = {
  ComplaintUpdate: mongoose.model('ComplaintUpdate', complaintUpdateSchema, 'complaint_updates'),
};
