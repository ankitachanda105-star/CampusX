const express = require('express');
const { QueueCounter } = require('../models/QueueCounter');
const { QueueToken } = require('../models/QueueToken');
const { Notification } = require('../models/Notification');
const { estimateWait } = require('../services/queuePredictor');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

const router = express.Router();

const DEFAULT_OFFICES = [
  { office: 'Accounts Office', code: 'A', activeCounters: 2, avgServiceDuration: 8 },
  { office: 'Examination Cell', code: 'E', activeCounters: 2, avgServiceDuration: 10 },
  { office: 'Student Welfare Office', code: 'S', activeCounters: 3, avgServiceDuration: 6 },
];

/**
 * Helper to ensure the 3 default offices are provisioned in MongoDB
 */
async function ensureOfficesSeeded() {
  for (const def of DEFAULT_OFFICES) {
    await QueueCounter.findOneAndUpdate(
      { office: def.office },
      { $setOnInsert: def },
      { upsert: true, new: true }
    );
  }
}

/**
 * GET /api/queues/offices
 * List all service counters with live metrics
 */
router.get('/offices', authenticateToken, async (req, res) => {
  try {
    await ensureOfficesSeeded();
    const counters = await QueueCounter.find().sort({ office: 1 });

    // Aggregate waiting counts per office
    const officeData = await Promise.all(
      counters.map(async (c) => {
        const waitingCount = await QueueToken.countDocuments({
          office: c.office,
          status: 'Waiting',
        });
        const estimatedWait = estimateWait(waitingCount, c.activeCounters, c.avgServiceDuration);
        return {
          ...c.toObject(),
          waitingCount,
          estimatedWait,
        };
      })
    );

    res.status(200).json({
      success: true,
      offices: officeData,
    });
  } catch (err) {
    console.error('Error fetching queue offices:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch queue offices', error: err.message });
  }
});

/**
 * POST /api/queues/join
 * Student joins queue for an office and gets a virtual token
 */
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { office } = req.body;
    const validOffices = DEFAULT_OFFICES.map((o) => o.office);
    if (!office || !validOffices.includes(office.trim())) {
      return res.status(400).json({
        success: false,
        message: `Invalid office selection. Allowed offices: ${validOffices.join(', ')}.`,
      });
    }

    await ensureOfficesSeeded();
    const counter = await QueueCounter.findOne({ office });
    if (!counter) {
      return res.status(404).json({ success: false, message: `Office '${office}' not found.` });
    }

    // Check if the student already has an active token in this office
    const existingToken = await QueueToken.findOne({
      office,
      student: req.user.userId,
      status: { $in: ['Waiting', 'Serving'] },
    });

    if (existingToken) {
      const peopleAhead = await QueueToken.countDocuments({
        office,
        status: 'Waiting',
        tokenNumber: { $lt: existingToken.tokenNumber },
      });
      const waitTime = estimateWait(peopleAhead, counter.activeCounters, counter.avgServiceDuration);

      return res.status(200).json({
        success: true,
        message: 'You already hold an active token for this office.',
        alreadyActive: true,
        token: existingToken,
        peopleAhead,
        estimatedWait: waitTime,
        currentlyServing: counter.currentServingToken,
      });
    }

    // Allocate next token number atomically
    const nextNumber = counter.lastTokenNumber + 1;
    const tokenCode = `${counter.code}-${String(nextNumber).padStart(3, '0')}`;

    counter.lastTokenNumber = nextNumber;
    await counter.save();

    const newToken = new QueueToken({
      tokenCode,
      tokenNumber: nextNumber,
      office,
      student: req.user.userId,
      studentName: req.user.name || 'Student',
      studentRegNo: req.user.regNo || 'N/A',
      status: 'Waiting',
    });

    await newToken.save();

    // People ahead are all waiting tokens with lower tokenNumber
    const peopleAhead = await QueueToken.countDocuments({
      office,
      status: 'Waiting',
      tokenNumber: { $lt: nextNumber },
    });

    const waitTime = estimateWait(peopleAhead, counter.activeCounters, counter.avgServiceDuration);

    // If student is already within 3 positions upon joining, create notification immediately
    if (peopleAhead <= 3 && !newToken.notificationSent) {
      await Notification.create({
        user: req.user.userId,
        type: 'QUEUE_ALERT',
        title: `Queue Alert — ${office}`,
        message: `Your token ${tokenCode} is within ${peopleAhead + 1} position(s) of being served! Please be prepared near the counter.`,
        metadata: { tokenCode, office, peopleAhead },
      });
      newToken.notificationSent = true;
      await newToken.save();
    }

    res.status(201).json({
      success: true,
      message: `Token ${tokenCode} generated successfully.`,
      token: newToken,
      peopleAhead,
      estimatedWait: waitTime,
      currentlyServing: counter.currentServingToken,
    });
  } catch (err) {
    console.error('Error joining queue:', err);
    res.status(500).json({ success: false, message: 'Failed to join queue', error: err.message });
  }
});

/**
 * GET /api/queues/my-token
 * Fetch active token status for the logged-in student
 */
router.get('/my-token', authenticateToken, async (req, res) => {
  try {
    const activeToken = await QueueToken.findOne({
      student: req.user.userId,
      status: { $in: ['Waiting', 'Serving'] },
    }).sort({ createdAt: -1 });

    if (!activeToken) {
      return res.status(200).json({
        success: true,
        hasActiveToken: false,
        token: null,
      });
    }

    const counter = await QueueCounter.findOne({ office: activeToken.office });
    const peopleAhead =
      activeToken.status === 'Serving'
        ? 0
        : await QueueToken.countDocuments({
            office: activeToken.office,
            status: 'Waiting',
            tokenNumber: { $lt: activeToken.tokenNumber },
          });

    const waitTime =
      activeToken.status === 'Serving'
        ? 0
        : estimateWait(peopleAhead, counter?.activeCounters || 1, counter?.avgServiceDuration || 8);

    res.status(200).json({
      success: true,
      hasActiveToken: true,
      token: activeToken,
      peopleAhead,
      estimatedWait: waitTime,
      currentlyServing: counter?.currentServingToken || null,
      activeCounters: counter?.activeCounters || 1,
      avgServiceDuration: counter?.avgServiceDuration || 8,
    });
  } catch (err) {
    console.error('Error fetching student token:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch token', error: err.message });
  }
});

/**
 * POST /api/queues/cancel
 * Student cancels their waiting token
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const { tokenId } = req.body;
    const token = await QueueToken.findOne({
      _id: tokenId,
      student: req.user.userId,
      status: 'Waiting',
    });

    if (!token) {
      return res.status(404).json({ success: false, message: 'Active waiting token not found.' });
    }

    token.status = 'Cancelled';
    await token.save();

    res.status(200).json({
      success: true,
      message: 'Token cancelled successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel token', error: err.message });
  }
});

/**
 * GET /api/queues/console/:office
 * Staff/Admin Queue Console for an office
 */
router.get(
  '/console/:office',
  authenticateToken,
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { office } = req.params;
      await ensureOfficesSeeded();

      const counter = await QueueCounter.findOne({ office });
      if (!counter) {
        return res.status(404).json({ success: false, message: `Office '${office}' not found.` });
      }

      // Waiting tokens
      const waitingTokens = await QueueToken.find({
        office,
        status: 'Waiting',
      }).sort({ tokenNumber: 1 });

      // Serving tokens
      const servingTokens = await QueueToken.find({
        office,
        status: 'Serving',
      }).sort({ updatedAt: -1 });

      // Recently completed tokens
      const completedTokens = await QueueToken.find({
        office,
        status: 'Completed',
      })
        .sort({ completedAt: -1 })
        .limit(10);

      const waitTime = estimateWait(waitingTokens.length, counter.activeCounters, counter.avgServiceDuration);

      res.status(200).json({
        success: true,
        office: counter,
        waitingTokens,
        servingTokens,
        completedTokens,
        stats: {
          totalWaiting: waitingTokens.length,
          totalServing: servingTokens.length,
          totalCompleted: completedTokens.length,
          estimatedNextWait: waitTime,
        },
      });
    } catch (err) {
      console.error('Error fetching queue console:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch queue console', error: err.message });
    }
  }
);

/**
 * POST /api/queues/call-next
 * Advances the active token in an office, notifies students within 3 positions
 */
router.post(
  '/call-next',
  authenticateToken,
  authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { office } = req.body;
      if (!office) {
        return res.status(400).json({ success: false, message: 'Office name is required.' });
      }

      await ensureOfficesSeeded();
      const counter = await QueueCounter.findOne({ office });
      if (!counter) {
        return res.status(404).json({ success: false, message: `Office '${office}' not found.` });
      }

      // 1. Mark existing serving tokens as Completed
      await QueueToken.updateMany(
        { office, status: 'Serving' },
        { $set: { status: 'Completed', completedAt: new Date() } }
      );

      // 2. Fetch next waiting token
      const nextToken = await QueueToken.findOne({
        office,
        status: 'Waiting',
      }).sort({ tokenNumber: 1 });

      if (!nextToken) {
        counter.currentServingToken = null;
        counter.currentServingNumber = 0;
        await counter.save();

        return res.status(200).json({
          success: true,
          message: 'No more waiting tokens in queue. Queue is now clear.',
          servingToken: null,
          counter,
        });
      }

      // 3. Update next token to Serving
      nextToken.status = 'Serving';
      nextToken.servedBy = req.user.userId;
      nextToken.servedAt = new Date();
      await nextToken.save();

      // Update counter
      counter.currentServingToken = nextToken.tokenCode;
      counter.currentServingNumber = nextToken.tokenNumber;
      await counter.save();

      // 4. Notify student whose token is being served now
      await Notification.create({
        user: nextToken.student,
        type: 'QUEUE_ALERT',
        title: `Token Called — ${office}`,
        message: `Your token ${nextToken.tokenCode} is NOW BEING SERVED at ${office}! Please proceed to the service desk immediately.`,
        metadata: { tokenCode: nextToken.tokenCode, office, status: 'Serving' },
      });

      // 5. In-app notifications: Check students who are now within 3 positions of being served
      // Get all remaining waiting tokens sorted by order
      const remainingWaiting = await QueueToken.find({
        office,
        status: 'Waiting',
      }).sort({ tokenNumber: 1 });

      for (let i = 0; i < Math.min(3, remainingWaiting.length); i++) {
        const studentToken = remainingWaiting[i];
        const positionsAway = i + 1;

        // Check if proximity notification already sent
        if (!studentToken.notificationSent) {
          await Notification.create({
            user: studentToken.student,
            type: 'QUEUE_ALERT',
            title: `Queue Alert — ${office}`,
            message: `Hurry up! You are now position #${positionsAway} in queue (${positionsAway === 1 ? 'next in line' : positionsAway + ' people ahead'}) for token ${studentToken.tokenCode} at ${office}.`,
            metadata: { tokenCode: studentToken.tokenCode, office, positionsAway },
          });

          studentToken.notificationSent = true;
          await studentToken.save();
        }
      }

      // Audit log entry
      await logActivity(
        req,
        'QUEUE_CALL_NEXT',
        `Queue Desk: ${office}`,
        `Called token ${nextToken.tokenCode} (Token #${nextToken.tokenNumber}) to counter.`
      );

      res.status(200).json({
        success: true,
        message: `Token ${nextToken.tokenCode} called successfully.`,
        servingToken: nextToken,
        remainingWaitingCount: remainingWaiting.length,
        counter,
      });
    } catch (err) {
      console.error('Error calling next queue token:', err);
      res.status(500).json({ success: false, message: 'Failed to call next token', error: err.message });
    }
  }
);

/**
 * POST /api/queues/config
 * Admin configuration of counters and average service duration
 */
router.post(
  '/config',
  authenticateToken,
  authorizeRoles('Admin', 'Super Admin'),
  async (req, res) => {
    try {
      const { office, activeCounters, avgServiceDuration } = req.body;

      if (!office) {
        return res.status(400).json({ success: false, message: 'Office name is required.' });
      }

      const counter = await QueueCounter.findOneAndUpdate(
        { office },
        {
          ...(activeCounters ? { activeCounters: Math.max(1, Number(activeCounters)) } : {}),
          ...(avgServiceDuration ? { avgServiceDuration: Math.max(1, Number(avgServiceDuration)) } : {}),
        },
        { new: true, upsert: true }
      );

      res.status(200).json({
        success: true,
        message: `Counter configuration for ${office} updated successfully.`,
        counter,
      });
    } catch (err) {
      console.error('Error updating queue config:', err);
      res.status(500).json({ success: false, message: 'Failed to update configuration', error: err.message });
    }
  }
);

module.exports = router;
