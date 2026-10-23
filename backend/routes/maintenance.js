const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Equipment } = require('../models/Equipment');
const { Resource } = require('../models/Resource');
const { Complaint } = require('../models/Complaint');
const { calculateRisk } = require('../services/maintenancePredictor');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

/**
 * Sync helper: Link resolved complaints from Module 2 to equipment records
 */
async function syncResolvedComplaints() {
  try {
    const resolvedComplaints = await Complaint.find({ status: 'Resolved' }).lean();
    if (!resolvedComplaints || resolvedComplaints.length === 0) return;

    const allEquipment = await Equipment.find().populate('parent_resource');

    for (const eq of allEquipment) {
      let modified = false;
      const existingComplaintIds = new Set(
        (eq.failure_history || []).map((f) => f.complaintId).filter(Boolean)
      );

      for (const comp of resolvedComplaints) {
        if (existingComplaintIds.has(comp.complaintId)) continue;

        // Check if complaint matches equipment's parent resource or equipment type
        const text = `${comp.title} ${comp.description} ${comp.roomLab || ''}`.toLowerCase();
        const typeMatch = text.includes(eq.type.toLowerCase()) || 
                          (eq.type === 'Air Conditioner' && text.includes('ac')) ||
                          (eq.type === 'Computer' && (text.includes('pc') || text.includes('imac') || text.includes('lab')));
        const idMatch = text.includes(eq.equipment_id.toLowerCase());
        const blockMatch = eq.parent_resource && comp.block === eq.parent_resource.block;

        if (idMatch || (blockMatch && typeMatch)) {
          eq.failure_history.push({
            date: comp.updatedAt || comp.createdAt || new Date(),
            complaintId: comp.complaintId,
            issue: `${comp.title}: ${comp.description.substring(0, 100)}`,
            loggedBy: 'Auto-linked from Resolved Complaint',
            resolvedDate: comp.updatedAt || new Date(),
          });
          existingComplaintIds.add(comp.complaintId);
          modified = true;
        }
      }

      if (modified) {
        await eq.save();
      }
    }
  } catch (err) {
    console.error('Error syncing resolved complaints to equipment:', err);
  }
}

/**
 * GET /api/maintenance/equipment
 * Returns all equipment sorted by risk score descending.
 * Guarded for Faculty/Staff, Admin, Super Admin
 */
router.get('/equipment', authenticateToken, authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    // Sync any newly resolved complaints
    await syncResolvedComplaints();

    const equipmentList = await Equipment.find()
      .populate('parent_resource', 'resource_id name block type capacity')
      .lean();

    const enriched = equipmentList.map((item) => {
      const riskEvaluation = calculateRisk(item);
      return {
        ...item,
        riskScore: riskEvaluation.riskScore,
        riskLevel: riskEvaluation.riskLevel,
        failureCount90Days: riskEvaluation.failureCount90Days,
        daysSinceLastMaintenance: riskEvaluation.daysSinceLastMaintenance,
        ageInMonths: riskEvaluation.ageInMonths,
        recommendedAction: riskEvaluation.recommendedAction,
      };
    });

    // Sort by risk score descending
    enriched.sort((a, b) => b.riskScore - a.riskScore);

    res.status(200).json({
      success: true,
      count: enriched.length,
      equipment: enriched,
    });
  } catch (err) {
    console.error('Error fetching equipment list:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving equipment.' });
  }
});

async function findEquipmentByIdOrCode(id, populateResource = false) {
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
    const q = populateResource
      ? Equipment.findById(id).populate('parent_resource')
      : Equipment.findById(id);
    const eq = await q;
    if (eq) return eq;
  }
  const q2 = populateResource
    ? Equipment.findOne({ equipment_id: id }).populate('parent_resource')
    : Equipment.findOne({ equipment_id: id });
  return await q2;
}

/**
 * GET /api/maintenance/equipment/:id
 * Equipment detail endpoint with month-by-month failure histogram for Recharts
 * Guarded for Faculty/Staff, Admin, Super Admin
 */
router.get('/equipment/:id', authenticateToken, authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const eq = await findEquipmentByIdOrCode(id, true);

    if (!eq) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const riskEvaluation = calculateRisk(eq);

    // Build 6-month failure count distribution for Recharts
    const monthCounts = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthCounts[key] = 0;
    }

    (eq.failure_history || []).forEach((f) => {
      const fDate = new Date(f.date);
      const key = fDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (monthCounts.hasOwnProperty(key)) {
        monthCounts[key]++;
      }
    });

    const monthlyFailures = Object.keys(monthCounts).map((month) => ({
      month,
      failures: monthCounts[month],
    }));

    res.status(200).json({
      success: true,
      equipment: {
        ...eq.toObject(),
        riskScore: riskEvaluation.riskScore,
        riskLevel: riskEvaluation.riskLevel,
        failureCount90Days: riskEvaluation.failureCount90Days,
        daysSinceLastMaintenance: riskEvaluation.daysSinceLastMaintenance,
        ageInMonths: riskEvaluation.ageInMonths,
        recommendedAction: riskEvaluation.recommendedAction,
        monthlyFailures,
      },
    });
  } catch (err) {
    console.error('Error fetching equipment detail:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving equipment detail.' });
  }
});

/**
 * POST /api/maintenance/equipment/:id/schedule
 * Schedules maintenance task assigned to Maintenance department
 */
router.post('/equipment/:id/schedule', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, department } = req.body;

    const eq = await findEquipmentByIdOrCode(id);

    if (!eq) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const taskId = `MT-${Date.now().toString().slice(-6)}`;
    eq.maintenance_tasks.push({
      taskId,
      scheduledDate: new Date(),
      status: 'Scheduled',
      department: department || 'Maintenance/Electrical',
      technicianNotes: notes || 'Preventative servicing scheduled from risk assessment.',
    });

    eq.status = 'Needs Maintenance';
    await eq.save();

    const riskEvaluation = calculateRisk(eq);

    // Audit log entry
    await logActivity(
      req,
      'MAINTENANCE_SCHEDULE',
      `Equipment ${eq.equipment_id}`,
      `Task ${taskId} assigned to ${department || 'Maintenance/Electrical'} (${notes || 'Preventative servicing'})`
    );

    res.status(200).json({
      success: true,
      message: `Maintenance task ${taskId} assigned to ${department || 'Maintenance/Electrical'} for ${eq.name} (${eq.equipment_id}).`,
      equipment: eq,
      riskScore: riskEvaluation.riskScore,
      riskLevel: riskEvaluation.riskLevel,
    });
  } catch (err) {
    console.error('Error scheduling maintenance:', err);
    res.status(500).json({ success: false, message: 'Server error scheduling maintenance.' });
  }
});

/**
 * POST /api/maintenance/equipment/:id/complete
 * Completes maintenance, resets last_maintenance_date to Date.now(), restores Operational status
 */
router.post('/equipment/:id/complete', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const eq = await findEquipmentByIdOrCode(id);

    if (!eq) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const prevRisk = calculateRisk(eq);

    // Reset last maintenance date to today
    eq.last_maintenance_date = new Date();
    eq.status = 'Operational';

    // Mark active tasks as Completed
    eq.maintenance_tasks.forEach((task) => {
      if (task.status !== 'Completed') {
        task.status = 'Completed';
        task.completedDate = new Date();
        if (notes) task.technicianNotes += ` | Servicing completed: ${notes}`;
      }
    });

    await eq.save();

    const newRisk = calculateRisk(eq);

    // Audit log entry
    await logActivity(
      req,
      'MAINTENANCE_CERTIFY',
      `Equipment ${eq.equipment_id}`,
      `Servicing certified. Risk score dropped from ${prevRisk.riskScore} to ${newRisk.riskScore} (${newRisk.riskLevel}). ${notes || ''}`
    );

    res.status(200).json({
      success: true,
      message: `Servicing certified for ${eq.equipment_id}. Last maintenance date updated to today. Risk score dropped from ${prevRisk.riskScore} to ${newRisk.riskScore} (${newRisk.riskLevel}).`,
      equipment: eq,
      previousRiskScore: prevRisk.riskScore,
      newRiskScore: newRisk.riskScore,
      newRiskLevel: newRisk.riskLevel,
    });
  } catch (err) {
    console.error('Error completing maintenance:', err);
    res.status(500).json({ success: false, message: 'Server error completing maintenance.' });
  }
});

/**
 * POST /api/maintenance/equipment/:id/failures
 * Allows admin to manually log a failure or incident
 */
router.post('/equipment/:id/failures', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { issue, complaintId, date } = req.body;

    if (!issue) {
      return res.status(400).json({ success: false, message: 'Issue description is required.' });
    }

    const eq = await findEquipmentByIdOrCode(id);

    if (!eq) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    eq.failure_history.push({
      date: date ? new Date(date) : new Date(),
      complaintId: complaintId || `MAN-${Date.now().toString().slice(-4)}`,
      issue: issue.trim(),
      loggedBy: req.user.name || 'Admin',
      resolvedDate: null,
    });

    eq.status = 'Needs Maintenance';
    await eq.save();

    const riskEvaluation = calculateRisk(eq);

    // Audit log entry
    await logActivity(
      req,
      'FAILURE_LOG',
      `Equipment ${eq.equipment_id}`,
      `Incident recorded: "${issue.trim()}". New risk score: ${riskEvaluation.riskScore} (${riskEvaluation.riskLevel})`
    );

    res.status(201).json({
      success: true,
      message: `Failure incident logged for ${eq.equipment_id}. New risk score: ${riskEvaluation.riskScore} (${riskEvaluation.riskLevel}).`,
      equipment: eq,
      riskScore: riskEvaluation.riskScore,
      riskLevel: riskEvaluation.riskLevel,
    });
  } catch (err) {
    console.error('Error logging equipment failure:', err);
    res.status(500).json({ success: false, message: 'Server error logging failure.' });
  }
});

module.exports = router;
