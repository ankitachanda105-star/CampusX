const { Resource } = require('./models/Resource');
const { ResourceBooking } = require('./models/ResourceBooking');
const { User } = require('./models/User');

async function seedPhase3Bookings() {
  const existingCount = await ResourceBooking.countDocuments();
  if (existingCount > 5) {
    return;
  }

  const faculty = await User.findOne({ role: 'Faculty/Staff' });
  const admin = await User.findOne({ role: 'Admin' });
  const userId = faculty?._id || admin?._id;
  const userName = faculty?.name || 'Dr. Eleanor Vance';
  const userRegNo = faculty?.regNo || 'EMP20491';

  const r32 = await Resource.findOne({ resource_id: '32-401' });
  const r34 = await Resource.findOne({ resource_id: '34-215' });
  const rLab01 = await Resource.findOne({ resource_id: 'CSE-LAB-01' });
  const rAud = await Resource.findOne({ resource_id: 'AUD-25' });
  const rSport = await Resource.findOne({ resource_id: 'SPORT-55' });

  const now = new Date();
  const bookingsToCreate = [];

  const targets = [
    { res: r32, daysBack: [1, 3, 5, 8, 10, 14, 18, 22, 25, 28], hoursPerSlot: 4, name: 'Algorithms & Data Structures Class' },
    { res: r34, daysBack: [2, 4, 7, 9, 12, 16, 20, 24], hoursPerSlot: 3, name: 'Database Management Systems Lab' },
    { res: rLab01, daysBack: [1, 2, 4, 6, 8, 11, 15, 19, 23, 27], hoursPerSlot: 4, name: 'Cloud Computing Practical Workshop' },
    { res: rAud, daysBack: [5, 12, 20], hoursPerSlot: 6, name: 'Annual Tech Summit & Hackathon Finals' },
    { res: rSport, daysBack: [3, 7, 10, 14, 21], hoursPerSlot: 4, name: 'Inter-Department Badminton Championship' },
  ];

  let idCounter = 1001;
  for (const t of targets) {
    if (!t.res) continue;
    for (const d of t.daysBack) {
      const bDate = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
      bookingsToCreate.push({
        bookingId: `CX-BK${idCounter++}`,
        resource: t.res._id,
        resourceName: t.res.name,
        resourceCode: t.res.resource_id,
        location: `${t.res.block} (${t.res.type})`,
        user: userId,
        userName,
        userRegNo,
        userRole: 'Faculty/Staff',
        userDepartment: 'School of Computer Science & Engineering',
        eventName: t.name,
        purpose: 'Scheduled Academic & Department Session',
        bookingDate: bDate,
        startTime: '09:00',
        endTime: t.hoursPerSlot === 4 ? '13:00' : (t.hoursPerSlot === 6 ? '15:00' : '12:00'),
        status: 'Confirmed',
      });
    }
  }

  for (const b of bookingsToCreate) {
    await ResourceBooking.findOneAndUpdate(
      { bookingId: b.bookingId },
      { $set: b },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${bookingsToCreate.length} historical bookings for utilization tracking.`);
}

module.exports = {
  seedPhase3Bookings,
};
