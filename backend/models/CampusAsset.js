const mongoose = require('mongoose');
const { calculateRiskScore } = require('../services/maintenanceRiskPredictor');

const CampusAssetSchema = new mongoose.Schema(
  {
    assetId: {
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
    category: {
      type: String,
      required: true,
      enum: [
        'HVAC & Cooling',
        'Network & IT Infrastructure',
        'Electrical & Power',
        'Elevators & Lifts',
        'Lab Machinery',
        'Sanitation & Plumbing',
      ],
      index: true,
    },
    block: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    manufacturer: {
      type: String,
      default: 'LPU Engineering Facilities',
    },
    modelNumber: {
      type: String,
      default: 'Standard Institutional Spec',
    },
    installDate: {
      type: Date,
      required: true,
    },
    ageInMonths: {
      type: Number,
      required: true,
      default: 24,
    },
    expectedLifeMonths: {
      type: Number,
      default: 120,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastServiceDate: {
      type: Date,
      default: Date.now,
    },
    nextScheduledDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Operational', 'Requires Attention', 'Critical Failure Risk', 'In Maintenance'],
      default: 'Operational',
      index: true,
    },
    riskScore: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    recommendedAction: {
      type: String,
      default: 'Routine operation.',
    },
  },
  {
    timestamps: true,
  }
);

// Method to re-evaluate risk score dynamically
CampusAssetSchema.methods.recalculateRisk = function () {
  const daysSinceService = Math.round(
    (Date.now() - new Date(this.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const evaluation = calculateRiskScore(
    this.ageInMonths,
    this.failureCount,
    daysSinceService,
    this.expectedLifeMonths
  );

  this.riskScore = evaluation.riskScore;
  this.riskLevel = evaluation.riskLevel;
  this.recommendedAction = evaluation.recommendedAction;

  if (this.riskScore >= 85) {
    this.status = 'Critical Failure Risk';
  } else if (this.riskScore >= 70) {
    this.status = 'Requires Attention';
  } else if (this.status === 'Critical Failure Risk' || this.status === 'Requires Attention') {
    this.status = 'Operational';
  }

  return evaluation;
};

const CampusAsset = mongoose.model('CampusAsset', CampusAssetSchema);

const DEFAULT_LPU_ASSETS = [
  {
    assetId: 'EQ-HVAC-3401',
    name: 'Block 34 Central Multi-Zone Chiller Unit #2',
    category: 'HVAC & Cooling',
    block: 'Block 34',
    location: 'Rooftop Plant Room A',
    manufacturer: 'Daikin VRV System',
    modelNumber: 'U-30RXTQ',
    installDate: new Date('2020-03-15'),
    ageInMonths: 76,
    expectedLifeMonths: 120,
    failureCount: 4,
    lastServiceDate: new Date(Date.now() - 210 * 86400000), // 210 days ago -> CRITICAL
    status: 'Critical Failure Risk',
  },
  {
    assetId: 'EQ-ELEV-2502',
    name: 'Auditorium Passenger Elevator High-Speed Line 2',
    category: 'Elevators & Lifts',
    block: 'Block 25 (Auditorium & Administration)',
    location: 'South Shaft Ground to 6th Floor',
    manufacturer: 'Otis GeN2 Comfort',
    modelNumber: 'OTIS-GN2-1150',
    installDate: new Date('2022-01-10'),
    ageInMonths: 56,
    expectedLifeMonths: 180,
    failureCount: 3,
    lastServiceDate: new Date(Date.now() - 110 * 86400000), // 110 days ago -> HIGH RISK
    status: 'Requires Attention',
  },
  {
    assetId: 'EQ-NET-3205',
    name: 'Core Optical Aggregation Switch 48-Port 10GbE',
    category: 'Network & IT Infrastructure',
    block: 'Block 32',
    location: 'Server Utility Room Floor 2, Rack 04',
    manufacturer: 'Cisco Catalyst 9500',
    modelNumber: 'C9500-48Y4C',
    installDate: new Date('2023-08-20'),
    ageInMonths: 37,
    expectedLifeMonths: 96,
    failureCount: 1,
    lastServiceDate: new Date(Date.now() - 25 * 86400000), // 25 days ago -> LOW RISK
    status: 'Operational',
  },
  {
    assetId: 'EQ-PWR-1301',
    name: 'Central Library Silent Power Diesel Generator 500kVA',
    category: 'Electrical & Power',
    block: 'Block 13 (Central Library)',
    location: 'Rear Substation Yard Sub-03',
    manufacturer: 'Cummins Power Generation',
    modelNumber: 'C500D5e',
    installDate: new Date('2020-11-05'),
    ageInMonths: 70,
    expectedLifeMonths: 144,
    failureCount: 2,
    lastServiceDate: new Date(Date.now() - 55 * 86400000), // 55 days ago -> MEDIUM RISK
    status: 'Operational',
  },
  {
    assetId: 'EQ-LAB-3803',
    name: 'Industrial SLA 3D Rapid Prototyping Printer',
    category: 'Lab Machinery',
    block: 'Block 38',
    location: 'Advanced Fabrication Lab Room 102',
    manufacturer: 'Formlabs Form 4BL',
    modelNumber: 'FL-PR-4BL-01',
    installDate: new Date('2024-02-12'),
    ageInMonths: 31,
    expectedLifeMonths: 84,
    failureCount: 0,
    lastServiceDate: new Date(Date.now() - 15 * 86400000), // 15 days ago -> LOW RISK
    status: 'Operational',
  },
  {
    assetId: 'EQ-SAN-BH02',
    name: 'Boys Hostel Central RO Water Treatment Plant 5000LPH',
    category: 'Sanitation & Plumbing',
    block: 'BH-1',
    location: 'Basement Water Plant Facility',
    manufacturer: 'Thermax Water Technologies',
    modelNumber: 'THX-RO-5K',
    installDate: new Date('2021-07-20'),
    ageInMonths: 62,
    expectedLifeMonths: 120,
    failureCount: 3,
    lastServiceDate: new Date(Date.now() - 85 * 86400000), // 85 days ago -> MEDIUM/HIGH RISK
    status: 'Operational',
  },
];

async function seedDefaultAssets() {
  for (const item of DEFAULT_LPU_ASSETS) {
    let asset = await CampusAsset.findOne({ assetId: item.assetId });
    if (!asset) {
      asset = new CampusAsset(item);
    } else {
      Object.assign(asset, item);
    }
    asset.recalculateRisk();
    await asset.save();
  }
}

module.exports = {
  CampusAsset,
  DEFAULT_LPU_ASSETS,
  seedDefaultAssets,
};
