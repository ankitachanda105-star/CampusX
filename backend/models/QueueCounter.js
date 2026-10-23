const mongoose = require('mongoose');

const QueueCounterSchema = new mongoose.Schema(
  {
    office: {
      type: String,
      required: true,
      unique: true,
      enum: ['Accounts Office', 'Examination Cell', 'Student Welfare Office'],
    },
    code: {
      type: String,
      required: true,
      maxlength: 3,
    },
    activeCounters: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
    },
    avgServiceDuration: {
      type: Number,
      required: true,
      default: 8, // in minutes
      min: 1,
    },
    currentServingToken: {
      type: String,
      default: null,
    },
    currentServingNumber: {
      type: Number,
      default: 0,
    },
    lastTokenNumber: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const QueueCounter = mongoose.model('QueueCounter', QueueCounterSchema);

module.exports = {
  QueueCounter,
};
