const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Complaint, STATUS_VALUES, PRIORITY_VALUES } = require('../models/Complaint');
const { ComplaintUpdate } = require('../models/ComplaintUpdate');
const { User } = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { classifyComplaint } = require('../services/aiClassifier');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/complaints');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `complaint-${uniqueSuffix}${ext}`);
  },
});

// Validate image file type & 5MB size limit & strict extension check
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.py', '.bin',
      '.dll', '.msi', '.vbs', '.com', '.scr', '.ps1', '.jar'
    ];

    if (dangerousExtensions.includes(ext) || file.originalname.includes('\0')) {
      return cb(new Error(`Security Violation: Executable extension '${ext}' is strictly prohibited.`));
    }

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images up to 5MB are permitted.'));
    }
  },
});

/**
 * Generate sequential CX#### complaint identifier
 */
async function generateComplaintId() {
  const lastComplaint = await Complaint.findOne(
    { complaintId: /^CX\d+$/ },
    { complaintId: 1 }
  ).sort({ createdAt: -1 });

  let nextNumber = 1001;
  if (lastComplaint && lastComplaint.complaintId) {
    const match = lastComplaint.complaintId.match(/^CX(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Ensure uniqueness in case of race
  while (await Complaint.exists({ complaintId: `CX${nextNumber}` })) {
    nextNumber++;
  }

  return `CX${nextNumber}`;
}

// Apply authentication middleware to all complaint routes
router.use(authenticateToken);

/**
 * POST /api/complaints
 * Submit a new student problem report
 */
router.post('/', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { title, description, block, roomLab } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Complaint title is required.' });
      }
      if (title.trim().length < 3 || title.trim().length > 150) {
        return res.status(400).json({ success: false, message: 'Complaint title must be between 3 and 150 characters.' });
      }
      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Description is required.' });
      }
      if (description.trim().length < 10 || description.trim().length > 2000) {
        return res.status(400).json({ success: false, message: 'Description must be between 10 and 2000 characters.' });
      }
      if (!block || !block.trim()) {
        return res.status(400).json({ success: false, message: 'Campus block or hostel location is required.' });
      }

      const cleanRoom = (roomLab || '').trim();
      const location = cleanRoom ? `${block.trim()} - ${cleanRoom}` : block.trim();

      // Run AI Classification Stub (ready for Phase 4 ML microservice swap)
      const aiResult = classifyComplaint(title, description, location);

      // Generate sequential CX#### ID
      const complaintId = await generateComplaintId();

      const imageUrl = req.file ? `/uploads/complaints/${req.file.filename}` : null;

      // Create Complaint in MongoDB
      const complaint = new Complaint({
        complaintId,
        title: title.trim(),
        description: description.trim(),
        block: block.trim(),
        roomLab: cleanRoom,
        location,
        imageUrl,
        category: aiResult.category,
        priority: aiResult.priority,
        status: 'Assigned',
        submittedBy: req.user.userId,
        studentName: req.user.name,
        studentRegNo: req.user.regNo || '',
        studentEmail: req.user.email,
        department: aiResult.department,
        isSystemClassified: true,
      });

      await complaint.save();

      // Record initial creation in complaint_updates
      const initialUpdate = new ComplaintUpdate({
        complaint: complaint._id,
        complaintId: complaint.complaintId,
        status: 'Assigned',
        note: `Ticket submitted. Auto-classified by AI as '${aiResult.category}' with ${aiResult.priority} priority and routed to ${aiResult.department}.`,
        actor: req.user.userId,
        actorName: req.user.name,
        actorRole: req.user.role,
      });

      await initialUpdate.save();

      // Audit log entry
      await logActivity(
        req,
        'COMPLAINT_SUBMIT',
        `Complaint #${complaint.complaintId}`,
        `"${complaint.title}" in ${complaint.location} (Auto-routed: ${complaint.department}, Priority: ${complaint.priority})`
      );

      return res.status(201).json({
        success: true,
        message: 'Complaint registered successfully.',
        complaint,
        aiClassification: aiResult,
      });
    } catch (error) {
      console.error('Error submitting complaint:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit complaint.',
        error: error.message,
      });
    }
  });
});

/**
 * GET /api/complaints/my
 * Returns all complaints filed by the authenticated student
 */
router.get('/my', async (req, res) => {
  try {
    const complaints = await Complaint.find({ submittedBy: req.user.userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch student complaints.' });
  }
});

/**
 * GET /api/complaints/assigned
 * Returns complaints assigned to the logged-in staff member's department
 * Guarded for Faculty/Staff, Admin, Super Admin
 */
router.get(
  '/assigned',
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const userDept = req.user.department;
      let filter = {};

      if (req.user.role === 'Faculty/Staff') {
        if (!userDept) {
          return res.status(200).json({ success: true, complaints: [] });
        }
        filter = { department: userDept };
      } else if (req.query.department) {
        // Admin filtering
        filter = { department: req.query.department };
      }

      const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        department: userDept || 'All',
        count: complaints.length,
        complaints,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch assigned complaints.' });
    }
  }
);

/**
 * GET /api/complaints/all
 * Admin cross-campus complaint management table with multi-criteria filtering
 * Guarded for Admin, Super Admin
 */
router.get(
  '/all',
  authorizeRoles('Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { department, status, priority, block, search } = req.query;
      const query = {};

      if (department && department !== 'All') {
        query.department = department;
      }
      if (status && status !== 'All') {
        query.status = status;
      }
      if (priority && priority !== 'All') {
        query.priority = priority;
      }
      if (block && block !== 'All') {
        query.block = block;
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { complaintId: regex },
          { title: regex },
          { description: regex },
          { location: regex },
          { studentName: regex },
          { studentRegNo: regex },
        ];
      }

      const complaints = await Complaint.find(query).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: complaints.length,
        complaints,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch complaints table.' });
    }
  }
);

/**
 * GET /api/complaints/:id
 * Retrieve complaint details along with the complaint_updates timeline
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let complaint;

    if (id.startsWith('CX')) {
      complaint = await Complaint.findOne({ complaintId: id });
    } else {
      complaint = await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Role check: Students can only view their own tickets
    if (req.user.role === 'Student' && complaint.submittedBy.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot view complaints submitted by other students.',
      });
    }

    // Fetch chronological updates timeline
    const updates = await ComplaintUpdate.find({ complaint: complaint._id }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      complaint,
      updates,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving complaint details.' });
  }
});

/**
 * PATCH /api/complaints/:id/status
 * Staff/Admin action: accept complaint (-> In Progress) or resolve (-> Resolved)
 * Guarded for Faculty/Staff, Admin, Super Admin
 */
router.patch(
  '/:id/status',
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      if (!status || !STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${STATUS_VALUES.join(', ')}.`,
        });
      }

      let complaint = id.startsWith('CX')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found.' });
      }

      complaint.status = status;
      complaint.updatedAt = new Date();

      // If staff is accepting the complaint, assign staff member
      if (status === 'In Progress' && !complaint.assignedTo) {
        complaint.assignedTo = req.user.userId;
        complaint.assignedStaffName = req.user.name;
      }

      await complaint.save();

      // Record update in complaint_updates
      const updateRecord = new ComplaintUpdate({
        complaint: complaint._id,
        complaintId: complaint.complaintId,
        status,
        note: (note || '').trim() || `Status changed to '${status}' by ${req.user.name}.`,
        actor: req.user.userId,
        actorName: req.user.name,
        actorRole: req.user.role,
      });

      await updateRecord.save();

      // Audit log entry
      await logActivity(
        req,
        'COMPLAINT_STATUS_UPDATE',
        `Complaint #${complaint.complaintId}`,
        `Status transitioned to '${status}' by ${req.user.name}. ${note || ''}`
      );

      return res.status(200).json({
        success: true,
        message: `Complaint marked as '${status}'.`,
        complaint,
        updateRecord,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
    }
  }
);

/**
 * PATCH /api/complaints/:id/reassign
 * Admin action: reassign complaint to a different department or staff member
 * Guarded for Admin, Super Admin
 */
router.patch(
  '/:id/reassign',
  authorizeRoles('Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { department, assignedStaffName, note } = req.body;

      if (!department || !department.trim()) {
        return res.status(400).json({ success: false, message: 'Target department is required.' });
      }

      let complaint = id.startsWith('CX')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found.' });
      }

      const prevDepartment = complaint.department;
      complaint.department = department.trim();
      if (assignedStaffName) {
        complaint.assignedStaffName = assignedStaffName.trim();
      }
      complaint.updatedAt = new Date();
      await complaint.save();

      // Audit trail entry
      const auditNote = (note || '').trim()
        ? `${note.trim()} (Transferred from ${prevDepartment} to ${department})`
        : `Department reassigned from ${prevDepartment} to ${department} by Administrator ${req.user.name}.`;

      const updateRecord = new ComplaintUpdate({
        complaint: complaint._id,
        complaintId: complaint.complaintId,
        status: complaint.status,
        note: auditNote,
        actor: req.user.userId,
        actorName: req.user.name,
        actorRole: req.user.role,
      });

      await updateRecord.save();

      // Audit log entry
      await logActivity(
        req,
        'COMPLAINT_REASSIGN',
        `Complaint #${complaint.complaintId}`,
        `Transferred from '${prevDepartment}' to '${department}'. Staff: ${assignedStaffName || 'Unassigned'}`
      );

      return res.status(200).json({
        success: true,
        message: 'Complaint reassigned successfully.',
        complaint,
        updateRecord,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to reassign complaint.' });
    }
  }
);

module.exports = router;
