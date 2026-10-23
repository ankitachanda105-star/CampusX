/**
 * Maintenance Risk Prediction Service (CampusX - Phase 4 Active AI Layer)
 *
 * Calls Python FastAPI microservice (/maintenance-risk) Random Forest Regressor
 * Includes 1.5s timeout and automatic fallback to weighted multi-factor heuristic formula.
 */

const { postSync } = require('./aiClient');

/**
 * Calculates risk score (0-100) and risk level for a given equipment record.
 * Public interface is strictly preserved.
 *
 * @param {Object} equipment - Equipment object containing failure_history, last_maintenance_date, install_date, type
 * @returns {Object} { riskScore, riskLevel, failureCount90Days, daysSinceLastMaintenance, ageInMonths, recommendedAction, reason, isAI }
 */
function calculateRisk(equipment) {
  if (!equipment) {
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      failureCount90Days: 0,
      daysSinceLastMaintenance: 0,
      ageInMonths: 0,
      recommendedAction: 'No equipment data provided.',
      reason: 'No equipment telemetry available.',
      isAI: false,
      valueOf: () => 0,
    };
  }

  const now = Date.now();

  // 1. Compute physical parameters from equipment entity
  const ninetyDaysAgo = now - 90 * 86400000;
  const failureHistory = Array.isArray(equipment.failure_history) ? equipment.failure_history : [];
  const recentFailures = failureHistory.filter((f) => {
    const fDate = new Date(f.date || f.createdAt).getTime();
    return fDate >= ninetyDaysAgo;
  }).length;

  const lastMaintDate = equipment.last_maintenance_date
    ? new Date(equipment.last_maintenance_date).getTime()
    : now - 90 * 86400000;
  const daysSinceLastMaintenance = Math.max(0, Math.floor((now - lastMaintDate) / 86400000));

  const installDate = equipment.install_date
    ? new Date(equipment.install_date).getTime()
    : now - 365 * 86400000;
  const ageInDays = Math.max(0, Math.floor((now - installDate) / 86400000));
  const ageInMonths = Math.max(0, Math.floor(ageInDays / 30.4));
  const eqType = equipment.type || equipment.name || 'Air Conditioner';
  const isHeavyDuty = ['Air Conditioner', 'Projector', 'Lab Server', 'Water Cooler', 'AC'].some((t) =>
    eqType.toLowerCase().includes(t.toLowerCase())
  );
  const usageCategory = isHeavyDuty ? 'Heavy Duty' : 'Standard';

  // 2. Attempt Machine Learning Microservice
  const aiRes = postSync('/maintenance-risk', {
    equipment_age_days: ageInDays,
    failures_last_90_days: recentFailures,
    days_since_last_maintenance: daysSinceLastMaintenance,
    usage_category: usageCategory,
    equipment_type: eqType,
  }, 1500);

  if (aiRes && aiRes.success && typeof aiRes.risk_score === 'number') {
    const score = aiRes.risk_score;
    return {
      riskScore: score,
      riskLevel: aiRes.risk_level || (score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'),
      failureCount90Days: recentFailures,
      daysSinceLastMaintenance,
      ageInMonths,
      recommendedAction: aiRes.recommended_action || 'Inspect per AI risk assessment.',
      reason: aiRes.reason || `AI evaluated ${usageCategory} equipment with score ${score}/100.`,
      isAI: true,
      valueOf: () => score,
    };
  }

  // 3. Fallback to multi-factor heuristic formula if AI service is offline
  const failureFactor = Math.min(45, recentFailures * 15);

  let maintFactor = 0;
  if (daysSinceLastMaintenance > 180) {
    maintFactor = 35;
  } else if (daysSinceLastMaintenance > 90) {
    maintFactor = 25;
  } else if (daysSinceLastMaintenance > 45) {
    maintFactor = 15;
  } else if (daysSinceLastMaintenance > 30) {
    maintFactor = 5;
  }

  const expectedLife = Math.max(12, Number(equipment.expected_life_months) || 120);
  const ageFactor = Math.min(20, Math.round((ageInMonths / expectedLife) * 20));
  const riskScore = Math.min(100, Math.max(0, Math.round(failureFactor + maintFactor + ageFactor)));

  let riskLevel = 'LOW';
  let recommendedAction = 'Operating normally. Continue standard preventative maintenance.';

  if (riskScore >= 70) {
    riskLevel = 'HIGH';
    recommendedAction = 'HIGH RISK: Immediate servicing required. Multiple recent failures or overdue maintenance.';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
    recommendedAction = 'MEDIUM RISK: Inspect during next operational cycle. Schedule preventative calibration.';
  }

  return {
    riskScore,
    riskLevel,
    failureCount90Days: recentFailures,
    daysSinceLastMaintenance,
    ageInMonths,
    recommendedAction,
    reason: `Heuristic fallback: ${recentFailures} failures, ${daysSinceLastMaintenance}d overdue, ${ageInMonths}m old.`,
    isAI: false,
    valueOf: () => riskScore,
  };
}

module.exports = {
  calculateRisk,
};
