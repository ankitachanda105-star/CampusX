/**
 * Queue Wait Time Predictor Service (CampusX - Phase 4 Active AI Layer)
 *
 * Calls Python FastAPI microservice (/queue-wait) Random Forest Regressor
 * Includes 1.5s timeout and automatic fallback to theoretical queue formula.
 */

const { postSync } = require('./aiClient');

/**
 * Calculates the estimated wait time in minutes for a student in queue.
 * Public interface is strictly preserved.
 *
 * @param {number} peopleAhead - Number of people ahead in the queue
 * @param {number} counters - Number of active serving counters
 * @param {number} avgServiceTime - Average service duration per person in minutes
 * @param {Object} [options] - Optional context: { office, hour }
 * @returns {number} Estimated wait time in minutes
 */
function estimateWait(peopleAhead, counters, avgServiceTime, options = {}) {
  const safePeopleAhead = Math.max(0, Number(peopleAhead) || 0);
  const safeCounters = Math.max(1, Number(counters) || 1);
  const safeDuration = Math.max(1, Number(avgServiceTime) || 5);

  if (safePeopleAhead === 0) {
    return 0;
  }

  // 1. Attempt Machine Learning Microservice
  const currentHour = options.hour || new Date().getHours() || 11;
  const officeType = options.office || 'Accounts Office';

  const aiRes = postSync('/queue-wait', {
    people_ahead: safePeopleAhead,
    active_counters: safeCounters,
    avg_service_time_minutes: safeDuration,
    time_of_day_hour: currentHour,
    office_type: officeType,
  }, 1500);

  if (aiRes && aiRes.success && typeof aiRes.estimated_wait_minutes === 'number') {
    estimateWait.lastReason = aiRes.reason;
    estimateWait.lastIsAI = true;
    return aiRes.estimated_wait_minutes;
  }

  // 2. Fallback to classical M/M/c queuing baseline formula
  const rawWait = (safePeopleAhead * safeDuration) / safeCounters;
  estimateWait.lastReason = `Deterministic baseline: (${safePeopleAhead} × ${safeDuration}m) / ${safeCounters} desks.`;
  estimateWait.lastIsAI = false;
  return Math.round(rawWait);
}

module.exports = {
  estimateWait,
};
