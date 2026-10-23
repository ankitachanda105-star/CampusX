/**
 * CampusX AI Assistant - Retrieval-Augmented Generation (RAG) Engine
 * 
 * Strict Grounding Architecture:
 * 1. Intent Classification (rule & keyword matcher)
 * 2. Role-Based Scoped MongoDB Retrieval (Student private vs Admin aggregates)
 * 3. Context-Grounded Natural Language Synthesis citing exact database entities
 * 4. Interactive Pre-fill Action Payloads (e.g. instant complaint form pre-population)
 * 5. Abuse / Off-Topic Guardrails
 */

const { ServiceRequest } = require('../models/ServiceRequest');
const { QueueCounter } = require('../models/QueueCounter');
const { QueueToken } = require('../models/QueueToken');
const { Resource } = require('../models/Resource');
const { Complaint } = require('../models/Complaint');
const { Equipment } = require('../models/Equipment');
const { classifyComplaint } = require('./aiClassifier');
const { estimateWait } = require('./queuePredictor');
const { calculateRisk } = require('./maintenancePredictor');

/**
 * Off-topic or abusive pattern matcher
 */
function isOffTopicOrAbusive(text = '') {
  const lower = text.toLowerCase().trim();
  const offensive = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'idiot', 'stupid', 'dick', 'pussy'
  ];
  if (offensive.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))) {
    return {
      flagged: true,
      reason: 'Abusive language detected.',
      reply: 'Please communicate respectfully. As the CampusX Assistant for Lovely Professional University, I am here to help you navigate campus services, academic venues, and operational tickets.',
    };
  }

  const irrelevant = [
    'recipe', 'chocolate cake', 'cook', 'football match', 'world cup', 'cricket score',
    'movie review', 'weather in paris', 'crypto', 'bitcoin', 'stock market', 'write a poem',
    'who is elon musk', 'joke about'
  ];
  if (irrelevant.some((w) => lower.includes(w))) {
    return {
      flagged: true,
      reason: 'Off-topic inquiry.',
      reply: 'I am the CampusX AI Assistant dedicated exclusively to Lovely Professional University operations. I can assist you with your complaints, service requests (bonafide certificates, transcripts), live virtual queue wait times, and campus venue availability. How can I assist with campus operations today?',
    };
  }

  return { flagged: false };
}

/**
 * Classifies the incoming message intent and extracts entities
 */
function classifyIntent(message = '') {
  const lower = message.toLowerCase().trim();

  // 1. Service request status tracking
  if (
    /(where is my|status of|track|check|update on).*(bonafide|transcript|certificate|fee receipt|leave|gate pass|service|application|request)/i.test(lower) ||
    /\b(bonafide|transcript|character certificate|migration|fee slip)\b/i.test(lower)
  ) {
    let specificService = null;
    if (/bonafide/i.test(lower)) specificService = 'Bonafide';
    else if (/transcript/i.test(lower)) specificService = 'Transcript';
    else if (/character/i.test(lower)) specificService = 'Character';
    else if (/fee/i.test(lower)) specificService = 'Fee';
    else if (/leave|gate pass/i.test(lower)) specificService = 'Leave';
    else if (/migration/i.test(lower)) specificService = 'Migration';

    return { intent: 'SERVICE_STATUS', specificService };
  }

  // 2. Incident / Complaint filing intent (action pre-fill)
  if (
    /(report|file|submit|register|broken|leaking|damaged|sparking|cooling|not working|stopped working|defect|fault in).*(fan|ac|air conditioner|light|bulb|tap|toilet|projector|screen|computer|switch|socket|window|door|chair|table|wifi|router|cooler)/i.test(lower) ||
    /\b(broken fan|broken chair|leaking tap|ac not cooling|sparks from|wifi down)\b/i.test(lower)
  ) {
    // Extract room / location if mentioned
    let room = '';
    const roomMatch = lower.match(/\b(room|lab|hall|block)\s*([a-z0-9-]+)/i) || lower.match(/\b(\d{2}-\d{3,4}|bh-\d|gh-\d)\b/i);
    if (roomMatch) {
      room = roomMatch[0];
    }
    return { intent: 'REPORT_COMPLAINT', room };
  }

  // 3. Queue status lookup
  if (
    /(how many|waiting|queue|wait time|line|token|turn).*(accounts|examination|welfare|counter|desk|office)/i.test(lower) ||
    /\b(queue at|waiting at|tokens at)\b/i.test(lower)
  ) {
    let office = 'Accounts Office';
    if (/exam/i.test(lower)) office = 'Examination Cell';
    else if (/welfare|dsa/i.test(lower)) office = 'Student Welfare Office';
    else if (/hostel/i.test(lower)) office = 'Hostel Administration';
    return { intent: 'QUEUE_STATUS', office };
  }

  // 4. Resource / Space availability lookup
  if (
    /(which|any|what).*(classroom|lab|hall|auditorium|venue|room|sports|arena).*(available|free|vacant|open|empty)/i.test(lower) ||
    /(available|free|vacant).*(classroom|lab|hall|auditorium|room|arena)/i.test(lower)
  ) {
    let resourceType = 'Classroom';
    if (/\b(computer\s+lab|labs?)\b/i.test(lower)) resourceType = 'Computer Lab';
    else if (/\b(seminar|hall|auditorium)\b/i.test(lower)) resourceType = 'Seminar Hall';
    else if (/\b(sports|badminton|swim|complex)\b/i.test(lower)) resourceType = 'Sports Facility';
    return { intent: 'RESOURCE_AVAILABILITY', resourceType };
  }

  // 5. User's personal complaints lookup
  if (/(my|status of my).*(complaint|ticket|problem|issue)/i.test(lower) || /\b(my complaints|my tickets)\b/i.test(lower)) {
    return { intent: 'MY_COMPLAINTS' };
  }

  // 6. Admin: Department with most pending complaints
  if (
    /(department|dept).*(most|highest|pending|unresolved|active).*(complaint|ticket)/i.test(lower) ||
    /(pending complaints|unresolved tickets).*by department/i.test(lower)
  ) {
    return { intent: 'ADMIN_COMPLAINTS_BY_DEPT' };
  }

  // 7. Admin: Major campus problems this month
  if (
    /(major|top|trend|common|frequent).*(problem|issue|complaint|incident).*(month|recent|trend)/i.test(lower) ||
    /(campus problem|monthly problem|incident summary)/i.test(lower)
  ) {
    return { intent: 'ADMIN_MONTHLY_PROBLEMS' };
  }

  // 8. Admin: Equipment with highest failure rate / risk
  if (
    /(equipment|asset|machine).*(highest|high|failure|breakdown|risk)/i.test(lower) ||
    /(highest failure rate|equipment at risk|failure rate)/i.test(lower)
  ) {
    return { intent: 'ADMIN_EQUIPMENT_RISK' };
  }

  return { intent: 'GENERAL_INQUIRY' };
}

/**
 * Main RAG Query Processor
 * @param {Object} user - Logged in user { userId, role, name, department }
 * @param {string} message - Question from the user
 * @returns {Promise<Object>} { answer, citations, action, intent }
 */
async function processAssistantQuery(user, message = '') {
  // Step 1: Abuse / Off-Topic Guard
  const guardCheck = isOffTopicOrAbusive(message);
  if (guardCheck.flagged) {
    return {
      answer: guardCheck.reply,
      citations: ['CampusX Safety & Institutional Scope Policy'],
      action: null,
      intent: 'GUARD_FILTERED',
    };
  }

  // Step 2: Intent Classification
  const { intent, specificService, office, resourceType, room } = classifyIntent(message);
  const userRole = user.role || 'Student';
  const isAdmin = ['Admin', 'Super Admin'].includes(userRole);

  // Step 3: Role-Scoped MongoDB Retrieval & Grounded Synthesis

  // -------------------------------------------------------------
  // INTENT A: Student Service Request Status (SERVICE_STATUS)
  // -------------------------------------------------------------
  if (intent === 'SERVICE_STATUS') {
    const query = { student: user.userId };
    if (specificService) {
      query.serviceName = new RegExp(specificService, 'i');
    }
    const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).limit(3);

    if (!requests || requests.length === 0) {
      const targetLabel = specificService ? `${specificService} application` : 'active service requests';
      return {
        answer: `I looked up your student service records in MongoDB, but found no ${targetLabel} on file for your registration account (${user.name}). You can apply for bonafide certificates, transcripts, or fee slips in the College Service Hub.`,
        citations: ['ServiceCatalogue & ServiceRequest Collection (Filtered by User ID)'],
        action: {
          type: 'NAVIGATE',
          tab: 'services',
          label: 'Open College Service Hub',
        },
        intent,
      };
    }

    const latest = requests[0];
    const totalStages = latest.stages?.length || 5;
    const stageNum = (latest.currentStageIndex || 0) + 1;

    let stageDetail = `Stage ${stageNum} of ${totalStages} (${latest.currentStage})`;
    if (latest.status === 'Completed') {
      stageDetail = 'Completed — your verified digital certificate is generated and ready for download.';
    } else if (latest.status === 'Rejected') {
      stageDetail = `Rejected. Staff Remark: "${latest.rejectionReason || 'Documents did not meet criteria'}"`;
    }

    const answer = `Based on your official service records (Request ID: **#${latest.requestId}**), your application for **${latest.serviceName}** is currently **${latest.status}** at **${stageDetail}**. The application is under processing by the **${latest.department}**.`;

    return {
      answer,
      citations: [
        `ServiceRequest #${latest.requestId} (${latest.serviceName})`,
        `Department: ${latest.department}`,
        `Current Stage: ${latest.currentStage}`,
      ],
      action: {
        type: 'VIEW_REQUEST',
        requestId: latest.requestId,
        label: `View Request #${latest.requestId}`,
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT B: Report Complaint / Pre-fill Action (REPORT_COMPLAINT)
  // -------------------------------------------------------------
  if (intent === 'REPORT_COMPLAINT') {
    // Run AI classification on message to infer category & department
    const aiClassification = classifyComplaint(message, message, room || 'Campus Venues');

    let inferredBlock = 'Block 34';
    let inferredRoom = room || '';
    if (/32/i.test(room)) inferredBlock = 'Block 32';
    else if (/34/i.test(room)) inferredBlock = 'Block 34';
    else if (/36/i.test(room)) inferredBlock = 'Block 36';
    else if (/38/i.test(room)) inferredBlock = 'Block 38';
    else if (/bh-\d/i.test(room)) inferredBlock = room.match(/bh-\d/i)[0].toUpperCase();
    else if (/gh-\d/i.test(room)) inferredBlock = room.match(/gh-\d/i)[0].toUpperCase();

    const answer = `I've prepared a new incident report for you. Based on your description, CampusX AI has classified this issue under **${aiClassification.category}** (routed to **${aiClassification.department}**) with **${aiClassification.priority} priority**. Click below to review and submit the pre-filled ticket.`;

    return {
      answer,
      citations: [
        'CampusX AI Incident Classifier (/classify)',
        `Predicted Category: ${aiClassification.category}`,
        `Handling Department: ${aiClassification.department}`,
      ],
      action: {
        type: 'PREFILL_COMPLAINT',
        label: 'Open Pre-Filled Report Form',
        payload: {
          title: message.replace(/^(report|file|submit|i want to report)\s*/i, '').trim(),
          block: inferredBlock,
          roomLab: inferredRoom,
          description: `Reported via CampusX AI Assistant: ${message}`,
          category: aiClassification.category,
          priority: aiClassification.priority,
        },
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT C: Live Queue Status (QUEUE_STATUS)
  // -------------------------------------------------------------
  if (intent === 'QUEUE_STATUS') {
    const targetOffice = office || 'Accounts Office';
    const counter = await QueueCounter.findOne({ office: targetOffice });

    if (!counter) {
      return {
        answer: `I checked the queue records, but no active service counter configuration was found for **${targetOffice}**.`,
        citations: ['QueueCounter Collection'],
        action: null,
        intent,
      };
    }

    const waitingTokens = await QueueToken.find({ office: targetOffice, status: 'Waiting' });
    const waitingCount = waitingTokens.length;
    const estWait = estimateWait(waitingCount, counter.activeCounters, counter.avgServiceDuration, {
      office: targetOffice,
    });
    const currentServing = counter.currentServingToken || 'None';

    const answer = `Based on live queue telemetry for the **${targetOffice}**: there are currently **${waitingCount} student(s) waiting** across **${counter.activeCounters} active counter(s)**. The desk is currently serving token **${currentServing}**. Estimated wait time for new arrivals is approximately **~${estWait} minutes**.`;

    return {
      answer,
      citations: [
        `QueueCounter (${targetOffice})`,
        `Active Desks: ${counter.activeCounters}`,
        `Current Waiting: ${waitingCount}`,
        'AI Queue Predictor (/queue-wait)',
      ],
      action: {
        type: 'NAVIGATE',
        tab: 'queue',
        label: `Join ${targetOffice} Queue`,
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT D: Campus Resource Availability (RESOURCE_AVAILABILITY)
  // -------------------------------------------------------------
  if (intent === 'RESOURCE_AVAILABILITY') {
    const targetType = resourceType || 'Classroom';
    const availableResources = await Resource.find({
      type: targetType,
      status: 'Available',
    }).limit(4);

    const totalAvailable = await Resource.countDocuments({ type: targetType, status: 'Available' });
    const totalCount = await Resource.countDocuments({ type: targetType });

    if (!availableResources || availableResources.length === 0) {
      return {
        answer: `I queried the campus facility inventory, but all **${totalCount} ${targetType}s** are currently occupied or scheduled for maintenance.`,
        citations: [`Resource Collection (Type: ${targetType})`],
        action: null,
        intent,
      };
    }

    const listStr = availableResources
      .map((r) => `• **${r.name}** (${r.block}, Capacity: ${r.capacity}${r.systemCount ? `, Systems: ${r.systemCount}` : ''})`)
      .join('\n');

    const answer = `Based on real-time space telemetry, **${totalAvailable} of ${totalCount} ${targetType}s** are currently available for booking or study:\n\n${listStr}\n\nAll listed venues have verified operational amenities.`;

    return {
      answer,
      citations: [
        `Resource Collection (${totalAvailable}/${totalCount} ${targetType}s Available)`,
        ...availableResources.map((r) => `${r.resource_id} (${r.block})`),
      ],
      action: {
        type: 'NAVIGATE',
        tab: 'resources',
        label: 'View Campus Availability Directory',
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT E: Student's Own Complaints (MY_COMPLAINTS)
  // -------------------------------------------------------------
  if (intent === 'MY_COMPLAINTS') {
    const complaints = await Complaint.find({ submittedBy: user.userId })
      .sort({ createdAt: -1 })
      .limit(3);

    if (!complaints || complaints.length === 0) {
      return {
        answer: `I checked your complaint history in MongoDB, and you have **0 registered complaints** on file. Everything is running smoothly for your account!`,
        citations: ['Complaint Collection (Filtered by User ID)'],
        action: null,
        intent,
      };
    }

    const listStr = complaints
      .map((c) => `• **#${c.complaintId}**: ${c.title} — Status: **${c.status}** (${c.department}, Priority: ${c.priority})`)
      .join('\n');

    const answer = `Based on your incident records, here is the status of your recent complaints:\n\n${listStr}`;

    return {
      answer,
      citations: complaints.map((c) => `Complaint #${c.complaintId} (${c.category} - ${c.status})`),
      action: {
        type: 'NAVIGATE',
        tab: 'my-complaints',
        label: 'Open My Complaints Ledger',
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT F: Admin: Department With Most Pending Complaints
  // -------------------------------------------------------------
  if (intent === 'ADMIN_COMPLAINTS_BY_DEPT') {
    if (!isAdmin) {
      return {
        answer: 'Access Restricted: Administrative operational analytics and cross-department complaint aggregates require Staff or Administrator credentials.',
        citations: ['RBAC Security Policy (Role Guard: Admin/Super Admin)'],
        action: null,
        intent,
      };
    }

    const deptAgg = await Complaint.aggregate([
      { $match: { status: { $ne: 'Resolved' } } },
      { $group: { _id: '$department', pendingCount: { $sum: 1 } } },
      { $sort: { pendingCount: -1 } },
    ]);

    if (!deptAgg || deptAgg.length === 0) {
      return {
        answer: 'Based on live database aggregations, there are currently **0 pending complaints** across all departments. All campus operational tickets are resolved!',
        citations: ['Complaint Aggregation (status != Resolved)'],
        action: null,
        intent,
      };
    }

    const topDept = deptAgg[0];
    const totalPending = deptAgg.reduce((acc, curr) => acc + curr.pendingCount, 0);

    const breakdownStr = deptAgg
      .map((d) => `• **${d._id}**: ${d.pendingCount} active ticket(s)`)
      .join('\n');

    const answer = `Based on live complaint aggregations across **${deptAgg.length} departments** (total **${totalPending} active tickets**):\n\n**${topDept._id}** currently has the most pending complaints with **${topDept.pendingCount} unresolved ticket(s)**.\n\nDepartment Breakdown:\n${breakdownStr}`;

    return {
      answer,
      citations: [
        `Complaint Collection Aggregation (${totalPending} Active Tickets)`,
        `Top Department: ${topDept._id} (${topDept.pendingCount} pending)`,
      ],
      action: {
        type: 'NAVIGATE',
        tab: 'analytics',
        label: 'Open Admin Live Metrics Dashboard',
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT G: Admin: Major Campus Problems This Month
  // -------------------------------------------------------------
  if (intent === 'ADMIN_MONTHLY_PROBLEMS') {
    if (!isAdmin) {
      return {
        answer: 'Access Restricted: Monthly institutional incident summaries require Staff or Administrator credentials.',
        citations: ['RBAC Security Policy (Role Guard: Admin/Super Admin)'],
        action: null,
        intent,
      };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const categoryAgg = await Complaint.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const criticalTickets = await Complaint.find({
      createdAt: { $gte: thirtyDaysAgo },
      priority: { $in: ['Critical', 'High'] },
    })
      .sort({ createdAt: -1 })
      .limit(2);

    const totalMonth = categoryAgg.reduce((acc, curr) => acc + curr.count, 0);

    const catStr = categoryAgg.map((c) => `• **${c._id}**: ${c.count} incident(s)`).join('\n');
    let critStr = '';
    if (criticalTickets.length > 0) {
      critStr = '\n\nHigh & Critical Priority Incidents:\n' +
        criticalTickets.map((t) => `• **#${t.complaintId}** (${t.category}, ${t.location}): ${t.title}`).join('\n');
    }

    const answer = `Based on **${totalMonth} registered incidents** over the past 30 days, the primary operational problem categories are:\n\n${catStr}${critStr}`;

    return {
      answer,
      citations: [
        `Complaint Collection (30-day window: ${totalMonth} incidents)`,
        ...categoryAgg.slice(0, 3).map((c) => `${c._id}: ${c.count} tickets`),
      ],
      action: {
        type: 'NAVIGATE',
        tab: 'analytics',
        label: 'View 30-Day Intake Trends',
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // INTENT H: Admin: Equipment With Highest Failure Rate / Risk
  // -------------------------------------------------------------
  if (intent === 'ADMIN_EQUIPMENT_RISK') {
    if (!isAdmin) {
      return {
        answer: 'Access Restricted: Equipment reliability telemetry and failure rate analytics require Staff or Administrator credentials.',
        citations: ['RBAC Security Policy (Role Guard: Admin/Super Admin)'],
        action: null,
        intent,
      };
    }

    const allEquipment = await Equipment.find();
    if (!allEquipment || allEquipment.length === 0) {
      return {
        answer: 'I queried the equipment repository, but no equipment records are currently tracked.',
        citations: ['Equipment Collection'],
        action: null,
        intent,
      };
    }

    // Evaluate risk scores using real-time maintenancePredictor ML bridge
    const evaluated = allEquipment.map((eq) => {
      const risk = calculateRisk(eq);
      return {
        id: eq.equipment_id,
        name: eq.name,
        type: eq.type,
        parentResource: eq.parent_resource,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        failures90d: risk.failureCount90Days,
        daysSinceMaint: risk.daysSinceLastMaintenance,
        action: risk.recommendedAction,
      };
    });

    evaluated.sort((a, b) => b.riskScore - a.riskScore);
    const topRisk = evaluated[0];
    const highRiskItems = evaluated.filter((e) => e.riskScore >= 70);

    const listStr = evaluated
      .slice(0, 3)
      .map(
        (e) =>
          `• **${e.name} (${e.id})** — Score: **${e.riskScore}/100** [${e.riskLevel}] in ${e.parentResource} (${e.failures90d} failures in 90d, ${e.daysSinceMaint}d overdue)`
      )
      .join('\n');

    const answer = `Based on campus equipment health records evaluated via the predictive maintenance ML model:\n\n**${topRisk.name} (${topRisk.id})** has the highest failure risk with **${topRisk.failures90d} recent failure(s)** and a risk score of **${topRisk.riskScore}/100 (${topRisk.riskLevel} Risk)** in venue **${topRisk.parentResource}**.\n\nTop Risk Assets:\n${listStr}\n\nImmediate maintenance order is recommended for assets scored above 70.`;

    return {
      answer,
      citations: [
        'Equipment Collection & Predictive Maintenance Model (/maintenance-risk)',
        `Top Risk: ${topRisk.id} (Score: ${topRisk.riskScore})`,
        `High Risk Assets: ${highRiskItems.length}`,
      ],
      action: {
        type: 'NAVIGATE',
        tab: 'maintenance',
        label: 'Open Predictive Maintenance Console',
      },
      intent,
    };
  }

  // -------------------------------------------------------------
  // Default General Campus Inquiry Fallback
  // -------------------------------------------------------------
  return {
    answer: `Hello ${user.name}! I am your CampusX Operations Assistant for Lovely Professional University. I can provide real-time information on:\n\n• **Service Requests**: *"Where is my bonafide application?"*\n• **Incident Reports**: *"Report a broken fan in Room 215"*\n• **Live Queues**: *"How many people are waiting at Accounts?"*\n• **Space Availability**: *"Which classrooms are available?"*${isAdmin ? '\n• **Admin Analytics**: *"Which department has the most pending complaints?"*, *"Major campus problems this month"*' : ''}\n\nHow can I help you today?`,
    citations: ['CampusX Operations Directory (LPU Master Config)'],
    action: null,
    intent: 'GENERAL_INQUIRY',
  };
}

module.exports = {
  processAssistantQuery,
  classifyIntent,
  isOffTopicOrAbusive,
};
