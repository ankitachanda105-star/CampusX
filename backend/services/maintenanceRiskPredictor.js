/**
 * Predictive Maintenance Risk Scoring Service (CampusX - Module 6)
 *
 * Current implementation: Mathematical multi-factor risk heuristic stub
 * Phase 4 migration target: Python ML Microservice (Random Forest / XGBoost Risk Classifier)
 */

/**
 * Calculates risk score and failure probability for campus infrastructure equipment.
 *
 * @param {number} ageInMonths - Operating lifespan in months
 * @param {number} failureCount - Historical logged equipment breakdowns
 * @param {number} daysSinceLastService - Days elapsed since last certified maintenance service
 * @param {number} expectedLifeMonths - Manufacturer rated life span in months (default: 120)
 * @returns {object} { riskScore, riskLevel, recommendedAction }
 */
function calculateRiskScore(ageInMonths, failureCount, daysSinceLastService, expectedLifeMonths = 120) {
  const age = Math.max(0, Number(ageInMonths) || 0);
  const failures = Math.max(0, Number(failureCount) || 0);
  const daysSinceService = Math.max(0, Number(daysSinceLastService) || 0);
  const life = Math.max(12, Number(expectedLifeMonths) || 120);

  // 1. Age wear factor (up to 35 points)
  const ageFactor = Math.min(35, (age / life) * 35);

  // 2. Failure frequency factor (up to 40 points)
  const failureFactor = Math.min(40, failures * 12);

  // 3. Service recency factor (up to 25 points)
  let serviceFactor = 0;
  if (daysSinceService > 180) {
    serviceFactor = 25;
  } else if (daysSinceService > 90) {
    serviceFactor = 18;
  } else if (daysSinceService > 45) {
    serviceFactor = 10;
  } else if (daysSinceService > 30) {
    serviceFactor = 5;
  }

  const riskScore = Math.min(100, Math.max(5, Math.round(ageFactor + failureFactor + serviceFactor)));

  let riskLevel = 'LOW';
  let recommendedAction = 'Equipment operating normally. Continue scheduled preventative inspections.';

  if (riskScore >= 85) {
    riskLevel = 'CRITICAL';
    recommendedAction = 'CRITICAL ALERT: Imminent breakdown risk detected. Dispatch certified engineering technician immediately.';
  } else if (riskScore >= 70) {
    riskLevel = 'HIGH';
    recommendedAction = 'HIGH RISK: Subsystem wear elevated. Schedule comprehensive preventative service within 72 hours.';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
    recommendedAction = 'MODERATE WEAR: Perform sensor calibration, fluid/lubricant top-up, and filter inspection.';
  }

  return {
    riskScore,
    riskLevel,
    recommendedAction,
    metrics: {
      ageFactor: Math.round(ageFactor),
      failureFactor: Math.round(failureFactor),
      serviceFactor,
    },
  };
}

module.exports = {
  calculateRiskScore,
};
