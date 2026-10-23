const { Complaint } = require('./models/Complaint');
const { User } = require('./models/User');

async function seedDemoDashboardComplaints() {
  const count = await Complaint.countDocuments();
  if (count >= 5) return;

  const student = await User.findOne({ role: 'Student' });
  if (!student) return;

  const now = new Date();
  const complaints = [
    {
      complaintId: 'CX2101',
      title: 'Lab 01 projector flickers and loses HDMI connection',
      description: 'During practical coding sessions, the projector screen turns blank intermittently in CSE Lab 01.',
      block: 'Block 34',
      roomLab: 'CSE Lab 01',
      location: 'Block 34, CSE Lab 01',
      category: 'Academic Labs',
      priority: 'High',
      status: 'In Progress',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'School of Computer Science & Engineering',
      createdAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      complaintId: 'CX2102',
      title: 'Acoustic mic static noise in Seminar Hall 32',
      description: 'Lapel microphone produces high pitch static feedback during departmental lectures.',
      block: 'Block 32',
      roomLab: 'Seminar Hall 32',
      location: 'Block 32, Seminar Hall',
      category: 'Equipment',
      priority: 'Medium',
      status: 'Assigned',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'IT Services',
      createdAt: new Date(now.getTime() - 5 * 86400000),
    },
    {
      complaintId: 'CX2103',
      title: 'Water cooler filtration maintenance in BH-2',
      description: 'Filter replacement indicator light is blinking on the ground floor drinking station.',
      block: 'BH-2',
      roomLab: 'Ground Floor Lobby',
      location: 'BH-2, Ground Floor',
      category: 'Plumbing',
      priority: 'Low',
      status: 'Submitted',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'Hostel Administration',
      createdAt: new Date(now.getTime() - 1 * 86400000),
    },
    {
      complaintId: 'CX2104',
      title: 'Central AC cooling vent noise in Block 34-215',
      description: 'Excessive motor vibration and rattling sound from ceiling split AC.',
      block: 'Block 34',
      roomLab: 'Room 215',
      location: 'Block 34, Room 215',
      category: 'Electrical',
      priority: 'High',
      status: 'In Progress',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'Maintenance/Electrical',
      createdAt: new Date(now.getTime() - 3 * 86400000),
    },
    {
      complaintId: 'CX2105',
      title: 'Badminton court 3 floodlight tube replaced',
      description: 'Corner LED floodlight was dim. Certified replacement completed.',
      block: 'Block 55',
      roomLab: 'Court 3',
      location: 'Block 55 (Badminton Arena)',
      category: 'Electrical',
      priority: 'Medium',
      status: 'Resolved',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'Student Welfare',
      createdAt: new Date(now.getTime() - 4 * 86400000),
      updatedAt: new Date(),
    },
    {
      complaintId: 'CX2106',
      title: 'Hostel WiFi access point reboot in GH-1',
      description: 'WiFi access point in block B 3rd floor was unresponsive. Reboot and re-authentication verified.',
      block: 'GH-1',
      roomLab: 'Floor 3',
      location: 'GH-1, Floor 3',
      category: 'Network',
      priority: 'Medium',
      status: 'Resolved',
      submittedBy: student._id,
      studentName: student.name,
      studentEmail: student.email,
      department: 'IT Services',
      createdAt: new Date(now.getTime() - 6 * 86400000),
      updatedAt: new Date(),
    },
  ];

  for (const c of complaints) {
    await Complaint.findOneAndUpdate(
      { complaintId: c.complaintId },
      { $set: c },
      { upsert: true, new: true }
    );
  }

  console.log('Seeded demo dashboard complaints.');
}

module.exports = { seedDemoDashboardComplaints };
