const mongoose = require('mongoose');

const STATUS_VALUES = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
const PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Critical'];

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  block: {
    type: String,
    required: [true, 'Campus block or hostel is required'],
    trim: true,
  },
  roomLab: {
    type: String,
    default: '',
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  priority: {
    type: String,
    enum: PRIORITY_VALUES,
    default: 'Medium',
  },
  status: {
    type: String,
    enum: STATUS_VALUES,
    default: 'Assigned',
  },
  submittedBy: {
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
    default: '',
  },
  studentEmail: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: [true, 'Assigned department is required'],
    trim: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedStaffName: {
    type: String,
    default: null,
  },
  isSystemClassified: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = {
  Complaint: mongoose.model('Complaint', complaintSchema),
  STATUS_VALUES,
  PRIORITY_VALUES,
};
