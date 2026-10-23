const { ActivityLog } = require('../models/ActivityLog');

/**
 * Asynchronously log a sensitive system activity without blocking the request/response lifecycle.
 * @param {Object} req - Express request object (extracts user and IP)
 * @param {string} action - Action enum value from ACTIVITY_ACTIONS
 * @param {string} targetResource - Identifies the target entity (e.g., "Complaint #CX1002", "User DIR001")
 * @param {string} details - Additional descriptive context or notes
 */
async function logActivity(req, action, targetResource, details = '') {
  try {
    const user = req?.user || {};
    const ipAddress =
      req?.headers?.['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';

    const entry = new ActivityLog({
      user_id: user.userId || user.id || 'ANONYMOUS',
      userName: user.name || (req?.body?.email ? `User (${req.body.email})` : 'Anonymous User'),
      userRole: user.role || 'Unauthenticated',
      action,
      target_resource: targetResource || 'System',
      details: String(details || ''),
      ipAddress: String(ipAddress),
      timestamp: new Date(),
    });

    await entry.save();
    return entry;
  } catch (err) {
    // Fail-safe: Activity logging errors should never crash the primary business logic
    console.error('Activity logging failed:', err.message);
    return null;
  }
}

module.exports = {
  logActivity,
};
