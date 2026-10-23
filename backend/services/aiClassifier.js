/**
 * CampusX AI Classifier Service (Phase 4 Active AI Layer)
 * 
 * Powered by Python FastAPI microservice (TF-IDF + Logistic Regression & Random Forest).
 * Includes robust 1.5s timeout and automatic fallback to rule-based heuristics.
 */

const { postSync } = require('./aiClient');

/**
 * Normalizes priority to Title Case to conform with Complaint Mongoose Schema enum.
 */
function normalizePriority(val) {
  if (!val) return 'Medium';
  const s = String(val).trim().toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'high') return 'High';
  if (s === 'low') return 'Low';
  return 'Medium';
}

/**
 * Deterministic rule-based fallback logic (retained from Phase 2 stub for high availability)
 */
function ruleBasedClassifier(title = '', description = '', location = '') {
  const combinedText = `${title} ${description} ${location}`.toLowerCase();

  // Rule 0: Specific School of Computer Science & Engineering Academic Labs
  if (/\b(cse|computer science|coding lab|programming|compiler|software lab)\b/i.test(combinedText)) {
    return {
      category: 'Academic Labs',
      priority: 'High',
      department: 'School of Computer Science & Engineering',
      reason: 'Rule-based match: CSE lab and computer programming coursework terminology.',
      isAI: false,
    };
  }

  // Rule 1: Network & Internet
  if (/\b(wifi|wi-fi|internet|network|lan|router|ethernet|slow net|ums|portal|connectivity)\b/i.test(combinedText)) {
    return {
      category: 'Network',
      priority: 'High',
      department: 'IT Services',
      reason: 'Rule-based match: Campus networking and connectivity keywords.',
      isAI: false,
    };
  }

  // Rule 2: Equipment & Audio/Visual / Computers
  if (/\b(projector|computer|desktop|pc|monitor|keyboard|mouse|printer|speaker|mic|microphone|screen|hdmi|display|cpu)\b/i.test(combinedText)) {
    return {
      category: 'Equipment',
      priority: 'High',
      department: 'IT Services',
      reason: 'Rule-based match: Audio-visual and lab hardware equipment keywords.',
      isAI: false,
    };
  }

  // Rule 3: Electrical & Appliances
  if (/\b(fan|ac|air conditioner|light|bulb|tube|switch|socket|power|plug|wire|electricity|spark|short circuit|cooling)\b/i.test(combinedText)) {
    const isCritical = /\b(spark|fire|short circuit|burning)\b/i.test(combinedText);
    return {
      category: 'Electrical',
      priority: isCritical ? 'Critical' : 'Medium',
      department: 'Maintenance/Electrical',
      reason: `Rule-based match: Electrical appliance and power circuitry (${isCritical ? 'hazard detected' : 'standard'}).`,
      isAI: false,
    };
  }

  // Rule 4: Plumbing & Water
  if (/\b(water|leak|leakage|tap|faucet|washroom|toilet|restroom|drain|pipe|plumbing|flush|sewage|geyser)\b/i.test(combinedText)) {
    return {
      category: 'Plumbing',
      priority: 'High',
      department: 'Maintenance/Electrical',
      reason: 'Rule-based match: Water supply and sanitation fixture keywords.',
      isAI: false,
    };
  }

  // Rule 5: Housekeeping & Cleanliness
  if (/\b(clean|cleaning|dust|trash|garbage|dirt|dirty|sweeper|broom|mop|spill|waste|bin)\b/i.test(combinedText)) {
    return {
      category: 'Housekeeping',
      priority: 'Low',
      department: 'Housekeeping',
      reason: 'Rule-based match: Campus hygiene and waste management keywords.',
      isAI: false,
    };
  }

  // Rule 6: Hostel & Residential Living
  if (/\b(hostel|bed|almirah|warden|mess|food|canteen|room lock|door lock|curtain|mattress|laundry)\b/i.test(combinedText)) {
    return {
      category: 'Hostel',
      priority: 'Medium',
      department: 'Hostel Administration',
      reason: 'Rule-based match: Hostel room and residential facility keywords.',
      isAI: false,
    };
  }

  // Rule 7: Security & Safety
  if (/\b(security|guard|theft|stolen|lost|harassment|fight|id card check|gate pass|parking)\b/i.test(combinedText)) {
    return {
      category: 'Security',
      priority: 'Critical',
      department: 'Security',
      reason: 'Rule-based match: Campus safety and security incident keywords.',
      isAI: false,
    };
  }

  // Rule 8: Examination & Academics
  if (/\b(exam|examination|grade|marks|result|admit card|hall ticket|attendance|ca1|ca2|mid term|end term)\b/i.test(combinedText)) {
    return {
      category: 'Academics',
      priority: 'High',
      department: 'Examination Cell',
      reason: 'Rule-based match: Examination evaluation and academic record keywords.',
      isAI: false,
    };
  }

  // Rule 9: Accounts & Finance
  if (/\b(fee|receipt|refund|dues|payment|scholarship|challan|fine)\b/i.test(combinedText)) {
    return {
      category: 'Finance',
      priority: 'Medium',
      department: 'Accounts/Finance',
      reason: 'Rule-based match: University tuition, challan, and financial dues keywords.',
      isAI: false,
    };
  }

  // Default Fallback
  return {
    category: 'General Operations',
    priority: 'Medium',
    department: 'Student Welfare',
    reason: 'Rule-based default fallback: General campus operational inquiry.',
    isAI: false,
  };
}

/**
 * Classifies a complaint based on title, description, and location.
 * Public signature is preserved exactly.
 * 
 * @param {string} title - The complaint title
 * @param {string} description - Detailed problem description
 * @param {string} location - Selected LPU campus location / block / room
 * @returns {{ category: string, priority: 'Low' | 'Medium' | 'High' | 'Critical', department: string, reason?: string, isAI?: boolean }}
 */
function classifyComplaint(title = '', description = '', location = '') {
  // 1. Attempt Machine Learning Microservice via synchronous bridge
  const aiResponse = postSync('/classify', {
    title: String(title).trim(),
    description: String(description).trim(),
    location: String(location).trim(),
  }, 1500);

  if (aiResponse && aiResponse.success && aiResponse.category) {
    return {
      category: aiResponse.category,
      priority: normalizePriority(aiResponse.priority),
      department: aiResponse.department,
      reason: aiResponse.reason || 'Classified via TF-IDF + Logistic Regression model.',
      confidence: aiResponse.confidence,
      isAI: true,
    };
  }

  // 2. Fallback to rule-based heuristic if AI microservice is unreachable or timed out
  return ruleBasedClassifier(title, description, location);
}

module.exports = {
  classifyComplaint,
};
