const mongoose = require('mongoose');

const ROLES = ['Student', 'Faculty/Staff', 'Admin', 'Super Admin'];

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  regNo: {
    type: String,
    trim: true,
    sparse: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ROLES,
      message: '{VALUE} is not a valid role. Allowed roles are: ' + ROLES.join(', '),
    },
    default: 'Student',
  },
  department: {
    type: String,
    default: null,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Exclude password from JSON output by default
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = {
  User: mongoose.model('User', userSchema),
  ROLES,
};
