const express = require('express');
const router = express.Router();
const { Resource } = require('../models/Resource');
const { ResourceBooking } = require('../models/ResourceBooking');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

/**
 * Helper to compute duration in hours between two HH:mm strings
 */
function calculateHours(startTime, endTime) {
  const [sH, sM] = (startTime || '00:00').split(':').map(Number);
  const [eH, eM] = (endTime || '00:00').split(':').map(Number);
  const diff = (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60);
  return Math.max(0.5, Math.round(diff * 10) / 10);
}

/**
 * GET /api/resources
 * Public / Authenticated: Returns resources list with 30-day utilization metric.
 * Supports filters: ?block=Block+34&type=Classroom&status=Available&search=...
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { block, type, status, search } = req.query;
    const filter = {};

    if (block && block !== 'All') {
      filter.block = block;
    }
    if (type && type !== 'All') {
      filter.type = type;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { resource_id: { $regex: search, $options: 'i' } },
        { block: { $regex: search, $options: 'i' } },
      ];
    }

    const resources = await Resource.find(filter).sort({ block: 1, resource_id: 1 }).lean();

    // Compute 30-day utilization for each resource
    // 30 days * 8 operational hours/day = 240 available hours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const bookings = await ResourceBooking.find({
      bookingDate: { $gte: thirtyDaysAgo },
      status: { $in: ['Confirmed', 'Approved', 'Completed'] },
    }).lean();

    const bookingHoursMap = {};
    for (const b of bookings) {
      const resId = b.resource.toString();
      const hrs = calculateHours(b.startTime, b.endTime);
      bookingHoursMap[resId] = (bookingHoursMap[resId] || 0) + hrs;
    }

    const enriched = resources.map((r) => {
      const totalBookedHours = bookingHoursMap[r._id.toString()] || 0;
      // 240 operating hours available per month
      const utilizationPercent = Math.min(100, Math.round((totalBookedHours / 240) * 100));
      return {
        ...r,
        id: r.resource_id,
        code: r.resource_id,
        bookedHours30Days: Math.round(totalBookedHours),
        utilizationPercent,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      resources: enriched,
    });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving resources.' });
  }
});

/**
 * GET /api/resources/:id/availability
 * Checks occupied slots for a given resource on a specified date
 */
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query parameter (YYYY-MM-DD) is required.' });
    }

    // Accept either MongoDB ObjectId or resource_id
    let resource;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      resource = await Resource.findById(id);
    } else {
      resource = await Resource.findOne({ resource_id: id });
    }

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const bookings = await ResourceBooking.find({
      resource: resource._id,
      bookingDate: date,
      status: { $in: ['Confirmed', 'Approved', 'Pending Approval'] },
    }).select('startTime endTime eventName status bookingId');

    res.status(200).json({
      success: true,
      resourceId: resource.resource_id,
      resourceName: resource.name,
      date,
      bookedSlots: bookings,
    });
  } catch (err) {
    console.error('Error checking resource availability:', err);
    res.status(500).json({ success: false, message: 'Server error checking availability.' });
  }
});

/**
 * POST /api/resources/book
 * Faculty & Admin slot booking with collision prevention
 */
router.post('/book', authenticateToken, authorizeRoles('Faculty/Staff', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { resourceId, bookingDate, startTime, endTime, eventName, purpose } = req.body;

    if (!resourceId || !bookingDate || !startTime || !endTime || !eventName) {
      return res.status(400).json({
        success: false,
        message: 'Resource, date, start time, end time, and event title are mandatory.',
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!dateRegex.test(bookingDate)) {
      return res.status(400).json({ success: false, message: 'Invalid booking date format. Expected YYYY-MM-DD.' });
    }
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ success: false, message: 'Invalid time format. Expected HH:mm (24-hour).' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'Start time must be strictly earlier than end time.' });
    }
    if (eventName.trim().length < 3 || eventName.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Event title must be between 3 and 100 characters.' });
    }

    // Resolve resource
    let resource;
    if (resourceId.match(/^[0-9a-fA-F]{24}$/)) {
      resource = await Resource.findById(resourceId);
    } else {
      resource = await Resource.findOne({ resource_id: resourceId });
    }

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Specified resource not found.' });
    }

    if (resource.status === 'Under Maintenance') {
      return res.status(400).json({
        success: false,
        message: 'Resource is currently under maintenance and cannot be reserved.',
      });
    }

    // Collision Detection: StartA < EndB AND EndA > StartB
    const collision = await ResourceBooking.findOne({
      resource: resource._id,
      bookingDate,
      status: { $in: ['Confirmed', 'Approved', 'Pending Approval'] },
      $expr: {
        $and: [
          { $lt: ['$startTime', endTime] },
          { $gt: ['$endTime', startTime] },
        ],
      },
    });

    if (collision) {
      return res.status(409).json({
        success: false,
        message: `Booking Conflict: ${resource.name} is already booked from ${collision.startTime} to ${collision.endTime} for "${collision.eventName}". Please select another slot.`,
        collision: {
          bookingId: collision.bookingId,
          eventName: collision.eventName,
          startTime: collision.startTime,
          endTime: collision.endTime,
        },
      });
    }

    const bookingId = await ResourceBooking.generateNextBookingId();
    const durationHours = calculateHours(startTime, endTime);

    const booking = new ResourceBooking({
      bookingId,
      resource: resource._id,
      resourceName: resource.name,
      resourceCode: resource.resource_id,
      location: `${resource.block} (${resource.type})`,
      user: req.user.userId,
      userName: req.user.name,
      userRegNo: req.user.regNo || 'N/A',
      userRole: req.user.role,
      userDepartment: req.user.department || null,
      eventName,
      purpose: purpose || 'Academic Session / University Event',
      bookingDate,
      startTime,
      endTime,
      status: 'Confirmed',
    });

    await booking.save();

    // Audit log entry
    await logActivity(
      req,
      'RESOURCE_UPDATE',
      `ResourceBooking #${booking.bookingId}`,
      `Booked ${resource.name} (${resource.resource_id}) on ${bookingDate} from ${startTime} to ${endTime} for "${eventName}"`
    );

    res.status(201).json({
      success: true,
      message: `Facility reservation confirmed for ${resource.name}!`,
      booking,
    });
  } catch (err) {
    console.error('Error reserving resource:', err);
    res.status(500).json({ success: false, message: 'Server error processing reservation.' });
  }
});

/**
 * GET /api/resources/my-bookings
 * Returns authenticated user's reservations
 */
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await ResourceBooking.find({ user: req.user.userId })
      .sort({ bookingDate: -1, startTime: -1 })
      .populate('resource', 'resource_id name type block capacity systemCount');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error('Error retrieving personal bookings:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving bookings.' });
  }
});

/**
 * POST /api/resources
 * Admin: Create a new resource
 */
router.post('/', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { resource_id, name, type, block, capacity, systemCount, status, department, amenities } = req.body;

    if (!resource_id || !name || !type || !block || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'resource_id, name, type, block, and capacity are required.',
      });
    }

    const existing = await Resource.findOne({ resource_id: resource_id.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: `Resource with ID ${resource_id} already exists.` });
    }

    const resource = new Resource({
      resource_id: resource_id.trim(),
      name: name.trim(),
      type,
      block,
      capacity: Number(capacity),
      systemCount: Number(systemCount) || 0,
      status: status || 'Available',
      department: department || 'School of Computer Science & Engineering',
      amenities: Array.isArray(amenities) ? amenities : (amenities ? amenities.split(',').map((s) => s.trim()) : []),
    });

    await resource.save();

    // Audit log entry
    await logActivity(
      req,
      'RESOURCE_CREATE',
      `Resource ${resource.resource_id}`,
      `Created ${resource.type}: "${resource.name}" in ${resource.block} (Capacity: ${resource.capacity})`
    );

    res.status(201).json({
      success: true,
      message: `Resource ${resource.name} (${resource.resource_id}) created successfully.`,
      resource,
    });
  } catch (err) {
    console.error('Error creating resource:', err);
    res.status(500).json({ success: false, message: 'Server error creating resource.' });
  }
});

/**
 * PUT /api/resources/:id
 * Admin: Update existing resource
 */
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, block, capacity, systemCount, status, department, amenities } = req.body;

    let resource;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      resource = await Resource.findById(id);
    } else {
      resource = await Resource.findOne({ resource_id: id });
    }

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    if (name) resource.name = name.trim();
    if (type) resource.type = type;
    if (block) resource.block = block;
    if (capacity !== undefined) resource.capacity = Number(capacity);
    if (systemCount !== undefined) resource.systemCount = Number(systemCount);
    if (status) resource.status = status;
    if (department) resource.department = department;
    if (amenities !== undefined) {
      resource.amenities = Array.isArray(amenities) ? amenities : amenities.split(',').map((s) => s.trim());
    }

    await resource.save();

    // Audit log entry
    await logActivity(
      req,
      'RESOURCE_UPDATE',
      `Resource ${resource.resource_id}`,
      `Updated parameters: status=${resource.status}, capacity=${resource.capacity}`
    );

    res.status(200).json({
      success: true,
      message: `Resource ${resource.resource_id} updated successfully.`,
      resource,
    });
  } catch (err) {
    console.error('Error updating resource:', err);
    res.status(500).json({ success: false, message: 'Server error updating resource.' });
  }
});

/**
 * DELETE /api/resources/:id
 * Admin: Delete resource
 */
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    let resource;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      resource = await Resource.findByIdAndDelete(id);
    } else {
      resource = await Resource.findOneAndDelete({ resource_id: id });
    }

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    // Audit log entry
    await logActivity(
      req,
      'RESOURCE_DELETE',
      `Resource ${resource.resource_id}`,
      `Deleted ${resource.name} (${resource.type}) in ${resource.block}`
    );

    res.status(200).json({
      success: true,
      message: `Resource ${resource.resource_id} deleted successfully.`,
    });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.status(500).json({ success: false, message: 'Server error deleting resource.' });
  }
});

module.exports = router;
