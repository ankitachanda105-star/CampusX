const express = require('express');
const { Complaint } = require('../models/Complaint');
const { QueueToken } = require('../models/QueueToken');
const { QueueCounter } = require('../models/QueueCounter');
const { ServiceRequest } = require('../models/ServiceRequest');
const { Resource } = require('../models/Resource');
const { ResourceBooking } = require('../models/ResourceBooking');
const { CampusAsset } = require('../models/CampusAsset');
const { estimateWait } = require('../services/queuePredictor');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Aggregated live campus intelligence and operational metrics
 */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('Admin', 'Super Admin'),
  async (req, res) => {
    try {
      // 1. Complaints Intelligence
      const [
        totalComplaints,
        resolvedComplaints,
        inProgressComplaints,
        submittedComplaints,
      ] = await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: 'Resolved' }),
        Complaint.countDocuments({ status: 'In Progress' }),
        Complaint.countDocuments({ status: { $in: ['Submitted', 'Assigned'] } }),
      ]);

      const resolutionRate =
        totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

      // 2. Queue Operational Metrics
      const [waitingTokens, servingTokens, completedTokens, counters] = await Promise.all([
        QueueToken.countDocuments({ status: 'Waiting' }),
        QueueToken.countDocuments({ status: 'Serving' }),
        QueueToken.countDocuments({ status: 'Completed' }),
        QueueCounter.find(),
      ]);

      const totalActiveDesks = counters.reduce((sum, c) => sum + (c.activeCounters || 1), 0);

      const officeQueueBreakdown = await Promise.all(
        counters.map(async (c) => {
          const waiting = await QueueToken.countDocuments({
            office: c.office,
            status: 'Waiting',
          });
          const estWait = estimateWait(waiting, c.activeCounters, c.avgServiceDuration);
          return {
            office: c.office,
            code: c.code,
            activeCounters: c.activeCounters,
            currentlyServing: c.currentServingToken || 'Idle',
            waitingStudents: waiting,
            estimatedWaitMinutes: estWait,
          };
        })
      );

      // 3. College Service Hub KPIs
      const [totalServices, completedServices, inProgressServices, rejectedServices] =
        await Promise.all([
          ServiceRequest.countDocuments(),
          ServiceRequest.countDocuments({ status: 'Completed' }),
          ServiceRequest.countDocuments({ status: 'In Progress' }),
          ServiceRequest.countDocuments({ status: 'Rejected' }),
        ]);

      // 4. Resource Utilization
      const todayIso = new Date().toISOString().split('T')[0];
      const [totalResources, bookingsToday] = await Promise.all([
        Resource.countDocuments(),
        ResourceBooking.countDocuments({
          bookingDate: todayIso,
          status: { $in: ['Approved', 'Pending Approval'] },
        }),
      ]);

      const resourceUtilization =
        totalResources > 0 ? Math.min(100, Math.round((bookingsToday / totalResources) * 100)) : 0;

      // 5. Predictive Maintenance & Asset Health
      const [
        totalAssets,
        criticalRiskAssets,
        highRiskAssets,
        mediumRiskAssets,
        lowRiskAssets,
      ] = await Promise.all([
        CampusAsset.countDocuments(),
        CampusAsset.countDocuments({ riskLevel: 'CRITICAL' }),
        CampusAsset.countDocuments({ riskLevel: 'HIGH' }),
        CampusAsset.countDocuments({ riskLevel: 'MEDIUM' }),
        CampusAsset.countDocuments({ riskLevel: 'LOW' }),
      ]);

      // Calculate campus health index (100 - weighted risk deductions)
      const healthIndex =
        totalAssets > 0
          ? Math.max(
              20,
              Math.round(
                100 -
                  ((criticalRiskAssets * 30 + highRiskAssets * 15 + mediumRiskAssets * 5) /
                    (totalAssets * 30)) *
                    80
              )
            )
          : 95;

      res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        analytics: {
          complaints: {
            total: totalComplaints,
            resolved: resolvedComplaints,
            inProgress: inProgressComplaints,
            pending: submittedComplaints,
            resolutionRate,
          },
          queues: {
            totalWaiting: waitingTokens,
            totalServing: servingTokens,
            totalCompleted: completedTokens,
            activeDesks: totalActiveDesks,
            offices: officeQueueBreakdown,
          },
          services: {
            totalRequests: totalServices,
            completed: completedServices,
            inProgress: inProgressServices,
            rejected: rejectedServices,
          },
          resources: {
            totalFacilities: totalResources,
            activeBookingsToday: bookingsToday,
            utilizationRate: resourceUtilization,
          },
          maintenance: {
            totalAssets,
            criticalCount: criticalRiskAssets,
            highRiskCount: highRiskAssets,
            mediumRiskCount: mediumRiskAssets,
            lowRiskCount: lowRiskAssets,
            healthIndex,
          },
        },
      });
    } catch (err) {
      console.error('Error computing dashboard analytics:', err);
      res.status(500).json({ success: false, message: 'Failed to compute analytics', error: err.message });
    }
  }
);

module.exports = router;
