const express = require('express');
const { Notification } = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for current user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      user: req.user.userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
});

/**
 * POST /api/notifications/mark-read
 * Mark notification(s) as read
 */
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, user: req.user.userId },
        { $set: { read: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { user: req.user.userId, read: false },
        { $set: { read: true } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read.',
    });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to update notifications', error: err.message });
  }
});

module.exports = router;
