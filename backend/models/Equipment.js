const mongoose = require('mongoose');

const EQUIPMENT_TYPES = ['Projector', 'Air Conditioner', 'Computer', 'Fan', 'Light'];
const EQUIPMENT_STATUSES = ['Operational', 'Needs Maintenance', 'Under Repair'];

const FailureLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  complaintId: {
    type: String,
    default: null,
  },
  issue: {
    type: String,
    required: true,
  },
  loggedBy: {
    type: String,
    default: 'System Link / Admin',
  },
  resolvedDate: {
    type: Date,
    default: null,
  },
});

const MaintenanceTaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
  },
  scheduledDate: {
    type: Date,
    default: Date.now,
  },
  completedDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed'],
    default: 'Scheduled',
  },
  department: {
    type: String,
    default: 'Maintenance/Electrical',
  },
  technicianNotes: {
    type: String,
    default: '',
  },
});

const EquipmentSchema = new mongoose.Schema(
  {
    equipment_id: {
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
      enum: EQUIPMENT_TYPES,
      index: true,
    },
    parent_resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    install_date: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() - 365 * 86400000), // 1 year ago default
    },
    last_maintenance_date: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() - 60 * 86400000), // 60 days ago default
    },
    expected_life_months: {
      type: Number,
      default: 120,
    },
    failure_history: [FailureLogSchema],
    maintenance_tasks: [MaintenanceTaskSchema],
    status: {
      type: String,
      enum: EQUIPMENT_STATUSES,
      default: 'Operational',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Equipment = mongoose.model('Equipment', EquipmentSchema);

async function seedDefaultEquipment() {
  const { Resource } = require('./Resource');

  const r34_215 = await Resource.findOne({ resource_id: '34-215' });
  const rLab01 = await Resource.findOne({ resource_id: 'CSE-LAB-01' });
  const rAud25 = await Resource.findOne({ resource_id: 'AUD-25' });
  const r32_401 = await Resource.findOne({ resource_id: '32-401' });
  const rSport55 = await Resource.findOne({ resource_id: 'SPORT-55' });

  if (!r34_215 || !rLab01 || !rAud25) {
    console.log('Parent resources not ready yet for equipment seeding.');
    return;
  }

  const items = [
    {
      equipment_id: 'P-101',
      name: 'Classroom HD Laser Projector (Epson EB-L200F)',
      type: 'Projector',
      parent_resource: r34_215._id,
      install_date: new Date('2022-04-10'),
      last_maintenance_date: new Date(Date.now() - 115 * 86400000), // 115 days ago -> elevated risk
      expected_life_months: 60,
      status: 'Needs Maintenance',
      failure_history: [
        {
          date: new Date(Date.now() - 40 * 86400000),
          complaintId: 'CX2081',
          issue: 'Lamp flickering and overheating auto-shutdown during lecture',
          loggedBy: 'Complaint Resolution Hook',
          resolvedDate: new Date(Date.now() - 38 * 86400000),
        },
        {
          date: new Date(Date.now() - 75 * 86400000),
          complaintId: 'CX1945',
          issue: 'HDMI input port connector signal loss',
          loggedBy: 'Complaint Resolution Hook',
          resolvedDate: new Date(Date.now() - 73 * 86400000),
        },
      ],
    },
    {
      equipment_id: 'AC-301',
      name: 'Classroom Dual-Inverter Split AC 2.0 Ton (Daikin)',
      type: 'Air Conditioner',
      parent_resource: r34_215._id,
      install_date: new Date('2021-08-15'),
      last_maintenance_date: new Date(Date.now() - 190 * 86400000), // 190 days ago -> HIGH risk
      expected_life_months: 96,
      status: 'Needs Maintenance',
      failure_history: [
        {
          date: new Date(Date.now() - 25 * 86400000),
          complaintId: 'CX2104',
          issue: 'Compressor cut-off and water dripping on front row desks',
          loggedBy: 'Complaint Resolution Hook',
          resolvedDate: new Date(Date.now() - 23 * 86400000),
        },
        {
          date: new Date(Date.now() - 60 * 86400000),
          complaintId: 'CX1992',
          issue: 'Refrigerant gas leakage and low cooling airflow',
          loggedBy: 'Manual Admin Log',
          resolvedDate: new Date(Date.now() - 58 * 86400000),
        },
        {
          date: new Date(Date.now() - 85 * 86400000),
          complaintId: 'CX1820',
          issue: 'Blower fan motor vibrating excessively',
          loggedBy: 'Complaint Resolution Hook',
          resolvedDate: new Date(Date.now() - 83 * 86400000),
        },
      ],
    },
    {
      equipment_id: 'PC-501',
      name: 'Developer Workstation Cluster Node #01 (iMac M2)',
      type: 'Computer',
      parent_resource: rLab01._id,
      install_date: new Date('2023-01-20'),
      last_maintenance_date: new Date(Date.now() - 28 * 86400000), // 28 days ago -> LOW risk
      expected_life_months: 60,
      status: 'Operational',
      failure_history: [
        {
          date: new Date(Date.now() - 150 * 86400000),
          complaintId: 'CX1402',
          issue: 'macOS kernel panic and RAM diagnostic error',
          loggedBy: 'Manual Admin Log',
          resolvedDate: new Date(Date.now() - 148 * 86400000),
        },
      ],
    },
    {
      equipment_id: 'P-102',
      name: 'Lab Ceiling Projector High-Lumen (Sony VPL-PHZ50)',
      type: 'Projector',
      parent_resource: rLab01._id,
      install_date: new Date('2022-09-01'),
      last_maintenance_date: new Date(Date.now() - 85 * 86400000), // 85 days ago -> MEDIUM risk
      expected_life_months: 72,
      status: 'Operational',
      failure_history: [
        {
          date: new Date(Date.now() - 50 * 86400000),
          complaintId: 'CX2033',
          issue: 'Dust filter warning sensor triggered',
          loggedBy: 'Manual Admin Log',
          resolvedDate: new Date(Date.now() - 48 * 86400000),
        },
      ],
    },
    {
      equipment_id: 'AC-401',
      name: 'Auditorium Central Multi-Chiller Package (Voltas 25TR)',
      type: 'Air Conditioner',
      parent_resource: rAud25._id,
      install_date: new Date('2020-02-15'),
      last_maintenance_date: new Date(Date.now() - 210 * 86400000), // 210 days ago -> HIGH risk
      expected_life_months: 120,
      status: 'Needs Maintenance',
      failure_history: [
        {
          date: new Date(Date.now() - 20 * 86400000),
          complaintId: 'CX2155',
          issue: 'Condenser fan motor trip and thermostat failure',
          loggedBy: 'Complaint Resolution Hook',
          resolvedDate: new Date(Date.now() - 18 * 86400000),
        },
        {
          date: new Date(Date.now() - 65 * 86400000),
          complaintId: 'CX1971',
          issue: 'Chilled water supply line pressure drop',
          loggedBy: 'Manual Admin Log',
          resolvedDate: new Date(Date.now() - 63 * 86400000),
        },
      ],
    },
    {
      equipment_id: 'FAN-102',
      name: 'Acoustic Ceiling BLDC Fan Array #02 (Atomberg 1200mm)',
      type: 'Fan',
      parent_resource: (r32_401 || r34_215)._id,
      install_date: new Date('2023-05-10'),
      last_maintenance_date: new Date(Date.now() - 45 * 86400000), // 45 days ago -> LOW risk
      expected_life_months: 84,
      status: 'Operational',
      failure_history: [],
    },
    {
      equipment_id: 'LGT-201',
      name: 'Smart Dimmable LED Light Panel Matrix (Philips DALI)',
      type: 'Light',
      parent_resource: (r34_215 || rLab01)._id,
      install_date: new Date('2023-08-01'),
      last_maintenance_date: new Date(Date.now() - 35 * 86400000), // 35 days ago -> LOW risk
      expected_life_months: 72,
      status: 'Operational',
      failure_history: [],
    },
  ];

  for (const item of items) {
    await Equipment.findOneAndUpdate(
      { equipment_id: item.equipment_id },
      { $set: item },
      { upsert: true, new: true }
    );
  }
}

module.exports = {
  Equipment,
  EQUIPMENT_TYPES,
  EQUIPMENT_STATUSES,
  seedDefaultEquipment,
};
