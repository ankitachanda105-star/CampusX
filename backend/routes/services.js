const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ServiceCatalogue, seedDefaultServices } = require('../models/ServiceCatalogue');
const { ServiceRequest } = require('../models/ServiceRequest');
const { Notification } = require('../models/Notification');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// File filter (PDF, JPEG, JPG, PNG) and size limit 5MB with strict extension whitelist
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.py', '.bin',
      '.dll', '.msi', '.vbs', '.com', '.scr', '.ps1', '.jar'
    ];

    if (dangerousExtensions.includes(ext) || file.originalname.includes('\0')) {
      return cb(new Error(`Security Violation: Executable extension '${ext}' is strictly prohibited.`));
    }

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Image files (JPEG, PNG, WebP) up to 5MB are allowed.'));
    }
  },
});

/**
 * GET /api/services/catalogue
 * Returns all available LPU services (auto-seeds if empty)
 */
router.get('/catalogue', authenticateToken, async (req, res) => {
  try {
    let services = await ServiceCatalogue.find({ isActive: true }).sort({ name: 1 });
    if (services.length === 0) {
      await seedDefaultServices();
      services = await ServiceCatalogue.find({ isActive: true }).sort({ name: 1 });
    }

    res.status(200).json({
      success: true,
      services,
    });
  } catch (err) {
    console.error('Error fetching service catalogue:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch catalogue', error: err.message });
  }
});

/**
 * POST /api/services/request
 * Student submits new service application with supporting document
 */
router.post('/request', authenticateToken, (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Uploaded document exceeds maximum allowed size of 5MB.',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { serviceId, purpose } = req.body;

    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Valid service selection is required.' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ success: false, message: 'Application purpose or reason is required.' });
    }
    if (purpose.trim().length < 10 || purpose.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Application purpose must be between 10 and 1000 characters.' });
    }

    const service = await ServiceCatalogue.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Selected service not found in catalogue.' });
    }

    // Document is required or optional? Let's check:
    const documentUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;
    const documentOriginalName = req.file ? req.file.originalname : null;

    const nextRequestId = await ServiceRequest.generateNextRequestId();

    const newRequest = new ServiceRequest({
      requestId: nextRequestId,
      service: service._id,
      serviceName: service.name,
      serviceCode: service.code,
      department: service.department,
      student: req.user.userId,
      studentName: req.user.name || 'Student',
      studentRegNo: req.user.regNo || 'N/A',
      studentEmail: req.user.email || 'N/A',
      purpose: purpose.trim(),
      documentUrl,
      documentOriginalName,
      stages: service.stages || [
        'Submitted',
        'Document Verified',
        'Department Approval',
        'HOD Approval',
        'Certificate Generated',
      ],
      currentStageIndex: 0,
      currentStage: 'Submitted',
      status: 'In Progress',
      approvalHistory: [
        {
          stage: 'Submitted',
          action: 'Submitted',
          actor: req.user.userId,
          actorName: req.user.name || 'Student',
          actorRole: req.user.role || 'Student',
          remark: 'Service request initiated with supporting documents attached.',
          timestamp: new Date(),
        },
      ],
    });

    await newRequest.save();

    // Audit log entry
    await logActivity(
      req,
      'SERVICE_REQUEST',
      `ServiceRequest #${nextRequestId}`,
      `Applied for "${service.name}" (${service.department})`
    );

    // Create in-app notification for the student
    await Notification.create({
      user: req.user.userId,
      type: 'SERVICE_UPDATE',
      title: `Service Request Received — ${nextRequestId}`,
      message: `Your application for "${service.name}" has been logged successfully (ID: ${nextRequestId}). Track progress in your portal.`,
      metadata: { requestId: nextRequestId, serviceCode: service.code },
    });

    res.status(201).json({
      success: true,
      message: `Service request ${nextRequestId} submitted successfully.`,
      request: newRequest,
    });
  } catch (err) {
    console.error('Error submitting service request:', err);
    res.status(500).json({ success: false, message: 'Failed to submit service request', error: err.message });
  }
});

/**
 * GET /api/services/my
 * Student fetches all their service requests with progress and history
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ student: req.user.userId })
      .populate('service')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (err) {
    console.error('Error fetching student service requests:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: err.message });
  }
});

/**
 * GET /api/services/admin/queue
 * Staff/Admin approval queue of pending requests
 */
router.get(
  '/admin/queue',
  authenticateToken,
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { department, status, serviceCode } = req.query;

      const filter = {};

      // If user is Faculty/Staff and department is set, filter to their department unless Super Admin
      if (req.user.role === 'Faculty/Staff' && req.user.department) {
        // Staff can see their department's or all if department matches
        // Also allow matching service department
        filter.$or = [
          { department: req.user.department },
          { department: new RegExp(req.user.department, 'i') },
        ];
      }

      if (department && department !== 'All') {
        filter.department = department;
      }
      if (status && status !== 'All') {
        filter.status = status;
      }
      if (serviceCode && serviceCode !== 'All') {
        filter.serviceCode = serviceCode;
      }

      const requests = await ServiceRequest.find(filter)
        .populate('service')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        requests,
      });
    } catch (err) {
      console.error('Error fetching admin service queue:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch approval queue', error: err.message });
    }
  }
);

/**
 * GET /api/services/:id
 * Retrieve detailed status of a service request
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { requestId: id }],
    }).populate('service');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found.' });
    }

    // Role check: student can only view their own
    if (req.user.role === 'Student' && request.student.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this service request.' });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (err) {
    console.error('Error fetching service request details:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch details', error: err.message });
  }
});

/**
 * POST /api/services/:id/review
 * Staff/Admin approves or rejects at their stage with mandatory remark
 */
router.post(
  '/:id/review',
  authenticateToken,
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, remark } = req.body;

      if (!action || !['Approved', 'Rejected'].includes(action)) {
        return res.status(400).json({ success: false, message: "Action must be either 'Approved' or 'Rejected'." });
      }

      if (action === 'Rejected' && (!remark || !remark.trim())) {
        return res.status(400).json({
          success: false,
          message: 'A rejection reason/remark is mandatory when rejecting a service request.',
        });
      }

      const request = await ServiceRequest.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { requestId: id }],
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Service request not found.' });
      }

      if (request.status === 'Completed' || request.status === 'Rejected') {
        return res.status(400).json({
          success: false,
          message: `Request is already ${request.status.toLowerCase()} and cannot be reviewed further.`,
        });
      }

      const currentStageName = request.stages[request.currentStageIndex];

      if (action === 'Rejected') {
        request.status = 'Rejected';
        request.rejectionReason = (remark || 'Documents or criteria did not satisfy requirements.').trim();

        request.approvalHistory.push({
          stage: currentStageName,
          action: 'Rejected',
          actor: req.user.userId,
          actorName: req.user.name || 'Administrative Staff',
          actorRole: req.user.role || 'Staff',
          remark: request.rejectionReason,
          timestamp: new Date(),
        });

        await request.save();

        // Send rejection notification
        await Notification.create({
          user: request.student,
          type: 'SERVICE_UPDATE',
          title: `Request Rejected — ${request.requestId}`,
          message: `Your request for "${request.serviceName}" was rejected at "${currentStageName}". Reason: ${request.rejectionReason}`,
          metadata: { requestId: request.requestId, status: 'Rejected', rejectionReason: request.rejectionReason },
        });

        // Audit log entry
        await logActivity(
          req,
          'SERVICE_REJECT',
          `ServiceRequest #${request.requestId}`,
          `Stage "${currentStageName}": Rejected. Reason: ${request.rejectionReason}`
        );

        return res.status(200).json({
          success: true,
          message: `Service request ${request.requestId} rejected.`,
          request,
        });
      }

      // Action is 'Approved'
      const nextIndex = request.currentStageIndex + 1;
      const isFinalStage = nextIndex >= request.stages.length;

      request.approvalHistory.push({
        stage: currentStageName,
        action: 'Approved',
        actor: req.user.userId,
        actorName: req.user.name || 'Administrative Staff',
        actorRole: req.user.role || 'Staff',
        remark: (remark || `Approved stage: ${currentStageName}`).trim(),
        timestamp: new Date(),
      });

      if (isFinalStage) {
        request.status = 'Completed';
        request.currentStage = request.stages[request.stages.length - 1];
        await request.save();

        // Final completion notification
        await Notification.create({
          user: request.student,
          type: 'SERVICE_UPDATE',
          title: `Certificate Ready! — ${request.requestId}`,
          message: `Congratulations! Your "${request.serviceName}" has reached Certificate Generated status and is now ready for download/collection.`,
          metadata: { requestId: request.requestId, status: 'Completed' },
        });

        // Audit log entry
        await logActivity(
          req,
          'SERVICE_APPROVE',
          `ServiceRequest #${request.requestId}`,
          `Stage "${currentStageName}": Approved and Completed (Certificate Generated). Remark: ${remark || 'Approved'}`
        );

        return res.status(200).json({
          success: true,
          message: `Service request ${request.requestId} approved and marked Completed!`,
          request,
        });
      }

      // Move to next stage
      request.currentStageIndex = nextIndex;
      request.currentStage = request.stages[nextIndex];
      await request.save();

      // Audit log entry
      await logActivity(
        req,
        'SERVICE_APPROVE',
        `ServiceRequest #${request.requestId}`,
        `Stage "${currentStageName}": Approved and advanced to stage "${request.currentStage}". Remark: ${remark || 'Approved'}`
      );

      // Send progress notification
      await Notification.create({
        user: request.student,
        type: 'SERVICE_UPDATE',
        title: `Stage Approved — ${request.requestId}`,
        message: `Stage "${currentStageName}" approved! Your application has advanced to "${request.currentStage}".`,
        metadata: { requestId: request.requestId, currentStage: request.currentStage },
      });

      res.status(200).json({
        success: true,
        message: `Stage ${currentStageName} approved. Request advanced to ${request.currentStage}.`,
        request,
      });
    } catch (err) {
      console.error('Error reviewing service request:', err);
      res.status(500).json({ success: false, message: 'Failed to review request', error: err.message });
    }
  }
);

module.exports = router;
