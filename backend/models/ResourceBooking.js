const mongoose = require('mongoose');

const ResourceBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    resourceName: {
      type: String,
      required: true,
    },
    resourceCode: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRegNo: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    userDepartment: {
      type: String,
      default: null,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    bookingDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    startTime: {
      type: String, // Format: HH:mm (24-hour, e.g. "09:00")
      required: true,
    },
    endTime: {
      type: String, // Format: HH:mm (24-hour, e.g. "11:00")
      required: true,
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Approved', 'Pending Approval', 'Rejected', 'Cancelled', 'Completed'],
      default: 'Confirmed',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedByName: {
      type: String,
      default: null,
    },
    approvalRemark: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to generate sequential CX-BK#### IDs
ResourceBookingSchema.statics.generateNextBookingId = async function () {
  const lastBooking = await this.findOne({ bookingId: { $regex: /^CX-BK\d{4}$/ } })
    .sort({ bookingId: -1 })
    .select('bookingId');

  if (!lastBooking || !lastBooking.bookingId) {
    return 'CX-BK1001';
  }

  const numPart = parseInt(lastBooking.bookingId.replace('CX-BK', ''), 10);
  const nextNum = isNaN(numPart) ? 1001 : numPart + 1;
  return `CX-BK${nextNum}`;
};

const ResourceBooking = mongoose.model('ResourceBooking', ResourceBookingSchema);

module.exports = {
  ResourceBooking,
};
