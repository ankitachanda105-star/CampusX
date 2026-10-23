const mongoose = require('mongoose');

const RESOURCE_TYPES = ['Classroom', 'Computer Lab', 'Seminar Hall/Auditorium', 'Sports Facility'];
const STATUS_VALUES = ['Available', 'Occupied', 'Under Maintenance'];

const ResourceSchema = new mongoose.Schema(
  {
    resource_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: RESOURCE_TYPES,
      index: true,
    },
    block: {
      type: String,
      required: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    systemCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'Available',
      index: true,
    },
    department: {
      type: String,
      required: true,
      default: 'School of Computer Science & Engineering',
    },
    amenities: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for alias `id` and `code`
ResourceSchema.virtual('id').get(function () {
  return this.resource_id;
});
ResourceSchema.virtual('code').get(function () {
  return this.resource_id;
});

const Resource = mongoose.model('Resource', ResourceSchema);

const DEFAULT_LPU_RESOURCES = [
  // Classrooms
  {
    resource_id: '32-401',
    name: 'Smart Lecture Theatre 32-401',
    type: 'Classroom',
    block: 'Block 32',
    capacity: 80,
    systemCount: 0,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['Interactive Smart Board', 'Acoustic Surround Sound', 'Dual AC', 'Lecture Capture Camera'],
  },
  {
    resource_id: '34-215',
    name: 'Interactive Classroom 34-215',
    type: 'Classroom',
    block: 'Block 34',
    capacity: 60,
    systemCount: 0,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['Projector HD', 'Central AC', 'Motorized Screen', 'Whiteboard'],
  },
  // Computer Labs (CSE Lab 01–06)
  {
    resource_id: 'CSE-LAB-01',
    name: 'CSE Advanced Computing Lab 01',
    type: 'Computer Lab',
    block: 'Block 34',
    capacity: 60,
    systemCount: 60,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['60x Apple iMac M2', 'Gigabit LAN', 'Dual AC', 'Smart Display', 'UPS Backup'],
  },
  {
    resource_id: 'CSE-LAB-02',
    name: 'CSE Software Engineering Lab 02',
    type: 'Computer Lab',
    block: 'Block 34',
    capacity: 45,
    systemCount: 45,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['45x Dell OptiPlex Core i7', 'Fiber Internet', 'Central AC', 'Dual Projector'],
  },
  {
    resource_id: 'CSE-LAB-03',
    name: 'CSE Artificial Intelligence Lab 03',
    type: 'Computer Lab',
    block: 'Block 36',
    capacity: 50,
    systemCount: 50,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['50x NVIDIA RTX GPU Stations', 'Fiber LAN', 'Climate Control', 'Smart Board'],
  },
  {
    resource_id: 'CSE-LAB-04',
    name: 'CSE Networks & Cybersecurity Lab 04',
    type: 'Computer Lab',
    block: 'Block 36',
    capacity: 50,
    systemCount: 50,
    status: 'Occupied',
    department: 'School of Computer Science & Engineering',
    amenities: ['50x High-Performance PCs', 'Cisco Managed Switches', 'Central AC'],
  },
  {
    resource_id: 'CSE-LAB-05',
    name: 'CSE Cloud Computing & DevOps Lab 05',
    type: 'Computer Lab',
    block: 'Block 38',
    capacity: 40,
    systemCount: 40,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['40x Workstations', 'Dual Monitors', 'Fiber Internet', 'Ceiling AC'],
  },
  {
    resource_id: 'CSE-LAB-06',
    name: 'CSE Embedded Systems & IoT Lab 06',
    type: 'Computer Lab',
    block: 'Block 38',
    capacity: 40,
    systemCount: 40,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['40x Workstations', 'Oscilloscopes', 'IoT Testbeds', 'Solder Vents'],
  },
  // Seminar Halls / Auditoriums
  {
    resource_id: 'AUD-25',
    name: 'Shanti Devi Mittal Auditorium',
    type: 'Seminar Hall/Auditorium',
    block: 'Block 25 (Auditorium & Administration)',
    capacity: 2500,
    systemCount: 0,
    status: 'Available',
    department: 'Student Welfare',
    amenities: ['Dolby Sound System', 'Dual 4K Laser Projectors', 'Central AC', 'Stage Lighting', 'VIP Green Rooms'],
  },
  {
    resource_id: 'SEM-32',
    name: 'Block 32 Acoustic Seminar Hall',
    type: 'Seminar Hall/Auditorium',
    block: 'Block 32',
    capacity: 180,
    systemCount: 0,
    status: 'Available',
    department: 'School of Computer Science & Engineering',
    amenities: ['Tiered Seating', 'Surround Sound', 'Dual Projection', 'Central AC', 'Wireless Mics'],
  },
  // Sports Facilities
  {
    resource_id: 'SPORT-55',
    name: 'Indoor Badminton Arena',
    type: 'Sports Facility',
    block: 'Block 55',
    capacity: 150,
    systemCount: 0,
    status: 'Available',
    department: 'Student Welfare',
    amenities: ['6x Synthetic Wooden Courts', 'LED Floodlights', 'Spectator Gallery', 'Changing Rooms'],
  },
  {
    resource_id: 'SPORT-56',
    name: 'Olympic Swimming & Aquatic Complex',
    type: 'Sports Facility',
    block: 'Block 56',
    capacity: 300,
    systemCount: 0,
    status: 'Under Maintenance',
    department: 'Student Welfare',
    amenities: ['50m Heated Pool', 'Digital Touchpad Timing', 'Spectator Stands', 'Locker Facility'],
  },
];

async function seedDefaultResources() {
  for (const item of DEFAULT_LPU_RESOURCES) {
    await Resource.findOneAndUpdate(
      { resource_id: item.resource_id },
      { $set: item },
      { upsert: true, new: true }
    );
  }
}

module.exports = {
  Resource,
  RESOURCE_TYPES,
  STATUS_VALUES,
  DEFAULT_LPU_RESOURCES,
  seedDefaultResources,
};
