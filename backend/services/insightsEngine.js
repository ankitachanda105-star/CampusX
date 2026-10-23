const { QueueCounter } = require('../models/QueueCounter');
const { QueueToken } = require('../models/QueueToken');
const { Equipment } = require('../models/Equipment');
const { Resource } = require('../models/Resource');
const { ResourceBooking } = require('../models/ResourceBooking');
const { calculateRisk } = require('./maintenancePredictor');

/**
 * Generate real-time rule-based AI Insights based on live MongoDB data and ML outputs
 * @returns {Promise<Array>} List of insight objects
 */
async function generateAIInsights() {
  const insights = [];
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const sevenDaysAgo = new Date(now - 7 * 86400000);

  try {
    // -------------------------------------------------------------
    // 1. Queue Anomaly Check
    // Flag any office where current queue load is significantly above 7-day average
    // -------------------------------------------------------------
    const counters = await QueueCounter.find().lean();
    for (const c of counters) {
      const waitingCount = await QueueToken.countDocuments({
        office: c.office,
        status: 'Waiting',
      });

      // 7-day token volume
      const sevenDayTokens = await QueueToken.countDocuments({
        office: c.office,
        createdAt: { $gte: sevenDaysAgo },
      });
      const sevenDayDailyAvg = Math.max(1, Math.round(sevenDayTokens / 7));

      // Flag if waiting is significantly above normal load (e.g. >= 1.5x avg or >= 4 waiting)
      if (waitingCount >= 4 || waitingCount > sevenDayDailyAvg * 1.5) {
        insights.push({
          id: `queue-anomaly-${c.code || c.office.substring(0, 3)}`,
          type: 'warning',
          icon: '⚠️',
          category: 'QUEUE_ANOMALY',
          categoryLabel: 'Queue Anomaly',
          title: `Queue Congestion Surge: ${c.office}`,
          description: `Current waiting load (${waitingCount} students) is significantly higher than the 7-day daily baseline (~${sevenDayDailyAvg} students/day).`,
          recommendation: `Deploy 1 additional service desk or notify queued students via in-app broadcast.`,
          targetTab: 'queue',
          targetId: c.office,
          actionText: 'Open Queue Console',
          metric: `${waitingCount} waiting (Surge)`,
          severity: 'HIGH',
        });
      }
    }

    // -------------------------------------------------------------
    // 2. Repeated Failure Check
    // Flag any equipment with 3+ complaints/failures in 30 days
    // -------------------------------------------------------------
    const equipmentList = await Equipment.find().populate('parent_resource').lean();

    for (const eq of equipmentList) {
      const failuresLast30Days = (eq.failure_history || []).filter((f) => {
        const d = new Date(f.date);
        return d >= thirtyDaysAgo;
      });

      if (failuresLast30Days.length >= 3) {
        const venueName = eq.parent_resource?.name || eq.parent_resource?.block || 'Campus Venue';
        insights.push({
          id: `repeated-failure-${eq.equipment_id}`,
          type: 'warning',
          icon: '⚠️',
          category: 'REPEATED_FAILURE',
          categoryLabel: 'Repeated Failure',
          title: `Repeated Failure Alert: ${eq.name} (${eq.equipment_id})`,
          description: `Asset in ${venueName} has logged ${failuresLast30Days.length} incident reports in the last 30 days.`,
          recommendation: `Hardware replacement or manufacturer root-cause overhaul recommended to prevent repeated lecture interruptions.`,
          targetTab: 'maintenance',
          targetId: eq.equipment_id,
          actionText: 'Inspect Equipment',
          metric: `${failuresLast30Days.length} failures in 30d`,
          severity: 'CRITICAL',
        });
      }
    }

    // -------------------------------------------------------------
    // 3. Underutilized Resource Check
    // Flag any resource below 20% utilization over the last 30 days
    // -------------------------------------------------------------
    const resources = await Resource.find({ status: { $ne: 'Under Maintenance' } }).lean();
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().split('T')[0];

    const bookings = await ResourceBooking.find({
      bookingDate: { $gte: thirtyDaysAgoIso },
      status: { $in: ['Confirmed', 'Approved', 'Completed'] },
    }).lean();

    const bookingHoursMap = {};
    for (const b of bookings) {
      const resId = b.resource.toString();
      const [sH, sM] = (b.startTime || '00:00').split(':').map(Number);
      const [eH, eM] = (b.endTime || '00:00').split(':').map(Number);
      const hrs = Math.max(0.5, (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60));
      bookingHoursMap[resId] = (bookingHoursMap[resId] || 0) + hrs;
    }

    // Identify high-utilization resource for pairing suggestion
    let maxUtilResource = null;
    let maxUtilPercent = 0;

    const resourceWithUtils = resources.map((r) => {
      const bookedHours = bookingHoursMap[r._id.toString()] || 0;
      const utilPercent = Math.min(100, Math.round((bookedHours / 240) * 100));
      if (utilPercent > maxUtilPercent) {
        maxUtilPercent = utilPercent;
        maxUtilResource = r;
      }
      return { ...r, utilPercent, bookedHours };
    });

    for (const r of resourceWithUtils) {
      if (r.utilPercent < 20) {
        const pairSuggestion = maxUtilResource && maxUtilResource._id.toString() !== r._id.toString()
          ? ` Consider redistributing overflow sessions from ${maxUtilResource.name} (${maxUtilPercent}% utilization).`
          : ' Consider opening space for student project collaboration or scheduled tutoring.';

        insights.push({
          id: `underutilized-${r.resource_id}`,
          type: 'recommendation',
          icon: '💡',
          category: 'RESOURCE_OPTIMIZATION',
          categoryLabel: 'Space Optimization',
          title: `Underutilized Facility: ${r.name} (${r.block})`,
          description: `${r.name} is operating at only ${r.utilPercent}% capacity (${Math.round(r.bookedHours)}h / 240h) over the past 30 days.${pairSuggestion}`,
          recommendation: `Optimize department room bookings or consolidate exam batches to minimize utility overhead.`,
          targetTab: 'facilities',
          targetId: r.resource_id,
          actionText: 'Review Venue Capacity',
          metric: `${r.utilPercent}% 30-day occupancy`,
          severity: 'MEDIUM',
        });
        // Limit to 2 most underutilized to keep UI tidy
        if (insights.filter((i) => i.category === 'RESOURCE_OPTIMIZATION').length >= 2) break;
      }
    }

    // -------------------------------------------------------------
    // 4. High-Risk Equipment Count & Reasons
    // Surface top 3 from Phase 4 maintenance risk model
    // -------------------------------------------------------------
    const evaluatedEquipment = equipmentList.map((eq) => ({
      eq,
      risk: calculateRisk(eq),
    }));

    evaluatedEquipment.sort((a, b) => b.risk.riskScore - a.risk.riskScore);
    const topHighRisk = evaluatedEquipment.filter((item) => item.risk.riskScore >= 70).slice(0, 3);

    for (const item of topHighRisk) {
      const { eq, risk } = item;
      const venue = eq.parent_resource?.name || 'Classroom';
      insights.push({
        id: `high-risk-${eq.equipment_id}`,
        type: 'warning',
        icon: '⚠️',
        category: 'HIGH_RISK_EQUIPMENT',
        categoryLabel: 'Predictive Risk Alert',
        title: `High Breakdown Probability: ${eq.name} (${eq.equipment_id})`,
        description: `ML predictive score is ${risk.riskScore}/100 [HIGH RISK] in ${venue}. Compounded by ${risk.failureCount90Days} recent failures and ${risk.daysSinceLastMaintenance}d overdue servicing.`,
        recommendation: risk.recommendedAction || 'Execute preventative overhaul before scheduled academic lectures.',
        targetTab: 'maintenance',
        targetId: eq.equipment_id,
        actionText: 'Schedule Servicing',
        metric: `Risk Score: ${risk.riskScore}/100`,
        severity: 'HIGH',
      });
    }

    return insights;
  } catch (err) {
    console.error('Error generating AI Insights:', err);
    return [];
  }
}

module.exports = {
  generateAIInsights,
};
