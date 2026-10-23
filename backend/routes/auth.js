const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'campusx_jwt_secret_key_secure_2026_salt_987654321';
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * POST /api/auth/register
 * Register a new user (Restricted: only Students can self-register; Staff/Admin/SuperAdmin require Super Admin auth)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, regNo, email, password, role, department } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email format.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password cannot exceed 128 characters.' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Allowed roles: ${ROLES.join(', ')}.`,
      });
    }

    // Role-based privilege escalation prevention
    const targetRole = role || 'Student';
    if (targetRole !== 'Student') {
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        // Must be authenticated as Super Admin
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        let isSuperAdmin = false;
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.role === 'Super Admin') {
              isSuperAdmin = true;
            }
          } catch (e) {
            // invalid token
          }
        }

        if (!isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: `Privilege escalation blocked: Only Super Administrators can provision accounts with role '${targetRole}'.`,
          });
        }
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(regNo ? [{ regNo: regNo.trim() }] : []),
      ],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account with email '${normalizedEmail}' or ID '${regNo}' already exists.`,
      });
    }

    // Hash password with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      regNo: regNo ? regNo.trim() : undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role: targetRole,
      department: (targetRole === 'Student') ? null : (department || null),
    });

    await user.save();

    // Log registration
    await logActivity(
      req,
      'REGISTER',
      `User ${user.regNo || user.email}`,
      `New ${user.role} account created for ${user.name}`
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: user._id,
        regNo: user.regNo,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials (supports email or registration number), checks role, and returns JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    const identifier = (email || req.body.registration_number || req.body.regNo || '').trim();
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please enter your institutional email or registration/employee ID.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please enter your password.' });
    }

    const normalizedIdentifier = identifier.toLowerCase();
    // Support login via either email or registration/employee number
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { regNo: identifier },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.',
      });
    }

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Role verification if role dropdown is specified
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Role mismatch: This account is registered as '${user.role}', but you selected '${role}'.`,
      });
    }

    // Sign JWT payload with userId, regNo, role, department, name, email
    const payload = {
      userId: user._id.toString(),
      regNo: user.regNo,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Log authentication event
    await logActivity(
      { user: payload, headers: req.headers, socket: req.socket },
      'LOGIN',
      `User ${user.regNo || user.email}`,
      `Successful authentication session created for role '${user.role}'`
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        regNo: user.regNo,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        regNo: user.regNo,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching user profile.' });
  }
});

module.exports = router;
