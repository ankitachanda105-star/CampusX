const express = require('express');
const router = express.Router();
const { Complaint } = require('../models/Complaint');
const { ServiceRequest } = require('../models/ServiceRequest');
const { QueueToken } = require('../models/QueueToken');
const { QueueCounter } = require('../models/QueueCounter');
const { Resource } = require('../models/Resource');
const { ResourceBooking } = require('../models/ResourceBooking');
const { Equipment } = require('../models/Equipment');
const { User } = require('../models/User');
const { calculateRisk } = require('../services/maintenancePredictor');
const { generateAIInsights } = require('../services/insightsEngine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * GET /api/admin/dashboard
 * Aggregates all campus telemetry across modules using native MongoDB pipelines.
 * Query Parameters:
 *   - timeRange: 'today' | '7d' | '30d' (default: '30d')
 *   - department: 'All' or specific department name
 * Protected for Admin and Super Admin roles only.
 */
router.get('/dashboard', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { timeRange = '30d', department = 'All' } = req.query;

    const now = new Date();
    let startDate;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else {
      // Default 30 days
      startDate = new Date(now.getTime() - 30 * 86400000);
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const daysInWindow = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / 86400000));
    const availableHoursPerVenue = daysInWindow * 8; // 8 operational hours/day

    // 1. Complaint Match Conditions
    const complaintMatch = {
      createdAt: { $gte: startDate },
    };
    if (department && department !== 'All') {
      complaintMatch.department = department;
    }

    // 2. Aggregation: Active Complaints (status != 'Resolved')
    const activeComplaintsMatch = {
      status: { $ne: 'Resolved' },
      createdAt: { $gte: startDate },
    };
    if (department && department !== 'All') {
      activeComplaintsMatch.department = department;
    }
    const activeComplaintsCount = await Complaint.countDocuments(activeComplaintsMatch);

    // 3. Aggregation: Resolved Today
    const resolvedTodayMatch = {
      status: 'Resolved',
      updatedAt: { $gte: startOfToday },
    };
    if (department && department !== 'All') {
      resolvedTodayMatch.department = department;
    }
    const resolvedTodayCount = await Complaint.countDocuments(resolvedTodayMatch);

    // 4. Aggregation: Complaints by Department (for BarChart)
    const complaintsByDeptPipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $ne: ['$status', 'Resolved'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ];
    const complaintsByDeptRaw = await Complaint.aggregate(complaintsByDeptPipeline);
    const complaintsByDept = complaintsByDeptRaw.map((d) => ({
      department: d._id || 'Unassigned',
      shortName: (d._id || 'Other').split('/')[0].replace('School of ', ''),
      active: d.active,
      resolved: d.resolved,
      total: d.total,
    }));

    // 5. Aggregation: Complaint Volume Over Time (for LineChart)
    const complaintVolumeRaw = await Complaint.aggregate([
      { $match: complaintMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format volume entries nicely for Recharts
    const complaintVolumeTrend = complaintVolumeRaw.map((v) => ({
      date: v._id,
      label: new Date(v._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      complaints: v.count,
    }));

    // 6. Aggregation: Complaint Status Breakdown (for Donut Chart)
    const complaintStatusRaw = await Complaint.aggregate([
      { $match: complaintMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const STATUS_COLORS = {
      Submitted: '#3b82f6',
      Assigned: '#8b5cf6',
      'In Progress': '#f59e0b',
      Resolved: '#10b981',
    };
    const complaintStatusBreakdown = complaintStatusRaw.map((s) => ({
      name: s._id,
      value: s.count,
      color: STATUS_COLORS[s._id] || '#64748b',
    }));

    // 7. Aggregation: Pending Service Requests
    const serviceMatch = {
      status: 'In Progress',
      createdAt: { $gte: startDate },
    };
    if (department && department !== 'All') {
      serviceMatch.department = department;
    }
    const pendingServiceRequests = await ServiceRequest.countDocuments(serviceMatch);

    // 8. Queue Metrics
    // Tokens created today
    const todayTokensIssued = await QueueToken.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // Current Waiting Tokens
    const waitingTokensCount = await QueueToken.countDocuments({
      status: 'Waiting',
    });

    // Active Counters capacity
    const counterAggregation = await QueueCounter.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalDesks: { $sum: '$activeCounters' } } },
    ]);
    const totalActiveDesks = counterAggregation[0]?.totalDesks || 6;
    // Each desk nominally accommodates 5 waiting students before saturating queue buffer
    const nominalCapacity = Math.max(1, totalActiveDesks * 5);
    const queueLoadPercent = Math.min(100, Math.round((waitingTokensCount / nominalCapacity) * 100));

    // 9. Resource Utilization by Block & Overall (for BarChart)
    const startDateStr = startDate.toISOString().split('T')[0];

    const bookingsInWindow = await ResourceBooking.find({
      bookingDate: { $gte: startDateStr },
      status: { $in: ['Confirmed', 'Approved', 'Completed'] },
    }).populate('resource', 'block resource_id name capacity').lean();

    const blockBookedHours = {};
    const totalVenues = await Resource.countDocuments();
    let totalBookedHoursAll = 0;

    for (const b of bookingsInWindow) {
      if (!b.resource) continue;
      const blk = b.resource.block || 'Other';
      const [sH, sM] = (b.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (b.endTime || '00:00').split(':').map(Number);
      const diff = Math.max(1, (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60));
      blockBookedHours[blk] = (blockBookedHours[blk] || 0) + diff;
      totalBookedHoursAll += diff;
    }

    // Count venues per block
    const venuesByBlockRaw = await Resource.aggregate([
      { $group: { _id: '$block', count: { $sum: 1 } } },
    ]);

    const resourceUtilizationByBlock = venuesByBlockRaw.map((vb) => {
      const blk = vb._id;
      const venueCount = vb.count;
      const bookedHours = blockBookedHours[blk] || 0;
      const totalAvailable = Math.max(1, venueCount * availableHoursPerVenue);
      const util = Math.min(100, Math.round((bookedHours / totalAvailable) * 100));
      return {
        block: blk.replace(' (Auditorium & Administration)', ''),
        fullBlock: blk,
        venueCount,
        bookedHours: Math.round(bookedHours),
        utilization: util,
      };
    }).sort((a, b) => b.utilization - a.utilization);

    const overallAvailableHours = Math.max(1, totalVenues * availableHoursPerVenue);
    const overallResourceUtilization = Math.min(
      100,
      Math.round((totalBookedHoursAll / overallAvailableHours) * 100)
    );

    // 10. Equipment at High Risk (Using maintenance risk predictor stub)
    const allEquipment = await Equipment.find().populate('parent_resource').lean();
    let highRiskCount = 0;
    const highRiskEquipmentList = [];

    for (const eq of allEquipment) {
      const riskEval = calculateRisk(eq);
      if (riskEval.riskLevel === 'HIGH') {
        highRiskCount++;
        highRiskEquipmentList.push({
          equipment_id: eq.equipment_id,
          name: eq.name,
          type: eq.type,
          parentVenue: eq.parent_resource?.name || 'Venue',
          block: eq.parent_resource?.block || 'Block',
          riskScore: riskEval.riskScore,
          daysSinceLastMaintenance: riskEval.daysSinceLastMaintenance,
          failureCount90Days: riskEval.failureCount90Days,
        });
      }
    }

    // 11. Super Admin Section: User/Role Summary & Department Staff Count
    const userRoleSummaryRaw = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const userRoleSummary = userRoleSummaryRaw.map((u) => ({
      role: u._id,
      count: u.count,
    }));

    const departmentStaffCountRaw = await User.aggregate([
      { $match: { role: { $in: ['Faculty/Staff', 'Admin', 'Super Admin'] } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const departmentStaffCount = departmentStaffCountRaw.map((d) => ({
      department: d._id || 'Directorate / Unassigned',
      staffCount: d.count,
    }));

    // 12. Rule-Based Live AI Insights Generation
    const insights = await generateAIInsights();

    res.status(200).json({
      success: true,
      timeRange,
      department,
      timestamp: now.toISOString(),
      metrics: {
        activeComplaints: activeComplaintsCount,
        pendingServiceRequests,
        todayTokensIssued,
        currentQueueLoadPercent: queueLoadPercent,
        waitingTokens: waitingTokensCount,
        resolvedToday: resolvedTodayCount,
        overallResourceUtilization,
        equipmentAtHighRisk: highRiskCount,
      },
      charts: {
        complaintsByDepartment: complaintsByDept,
        complaintVolumeTrend,
        complaintStatusBreakdown,
        resourceUtilizationByBlock,
      },
      insights,
      superAdmin: {
        userRoleSummary,
        departmentStaffCount,
      },
      highRiskEquipment: highRiskEquipmentList,
    });
  } catch (err) {
    console.error('Error generating admin dashboard metrics:', err);
    res.status(500).json({ success: false, message: 'Server error generating dashboard analytics.' });
  }
});

module.exports = router;
