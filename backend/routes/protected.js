const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * All routes here require valid JWT authentication first
 */
router.use(authenticateToken);

// Student-accessible route
router.get('/student-only', authorizeRoles('Student'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to Student-only resource.',
    user: req.user,
  });
});

// Faculty-accessible route
router.get('/faculty-only', authorizeRoles('Faculty/Staff'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to Faculty/Staff-only resource.',
    user: req.user,
  });
});

// Admin-accessible route (Admin & Super Admin)
router.get('/admin-only', authorizeRoles('Admin', 'Super Admin'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to Admin-level operations.',
    user: req.user,
  });
});

// Super Admin-only route
router.get('/superadmin-only', authorizeRoles('Super Admin'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to Super Admin governance controls.',
    user: req.user,
  });
});

module.exports = router;
