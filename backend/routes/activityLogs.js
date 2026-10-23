const express = require('express');
const { ActivityLog, ACTIVITY_ACTIONS } = require('../models/ActivityLog');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/activity-logs
 * Retrieves security and sensitive action audit trail with multi-criteria filtering
 * Protected for Admin and Super Admin
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { action, userRole, search, startDate, endDate, limit = 50, page = 1 } = req.query;

      const query = {};

      if (action && action !== 'All') {
        query.action = action;
      }

      if (userRole && userRole !== 'All') {
        query.userRole = userRole;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { userName: regex },
          { target_resource: regex },
          { details: regex },
          { ipAddress: regex },
        ];
      }

      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const [logs, totalCount] = await Promise.all([
        ActivityLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        ActivityLog.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        count: logs.length,
        total: totalCount,
        page: parsedPage,
        totalPages: Math.ceil(totalCount / parsedLimit),
        availableActions: ACTIVITY_ACTIONS,
        logs,
      });
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity audit logs.',
        error: err.message,
      });
    }
  }
);

module.exports = router;
