const mongoose = require('mongoose');

const QueueTokenSchema = new mongoose.Schema(
  {
    tokenCode: {
      type: String,
      required: true,
      index: true,
    },
    tokenNumber: {
      type: Number,
      required: true,
      index: true,
    },
    office: {
      type: String,
      required: true,
      enum: ['Accounts Office', 'Examination Cell', 'Student Welfare Office'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentRegNo: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Waiting', 'Serving', 'Completed', 'Cancelled'],
      default: 'Waiting',
      index: true,
    },
    servedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    servedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const QueueToken = mongoose.model('QueueToken', QueueTokenSchema);

module.exports = {
  QueueToken,
};
