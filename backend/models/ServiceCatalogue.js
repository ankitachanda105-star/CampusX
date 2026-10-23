const mongoose = require('mongoose');

const ServiceCatalogueSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    requiredDocuments: [
      {
        type: String,
        required: true,
      },
    ],
    stages: {
      type: [String],
      default: [
        'Submitted',
        'Document Verified',
        'Department Approval',
        'HOD Approval',
        'Certificate Generated',
      ],
    },
    estimatedDays: {
      type: Number,
      default: 3,
    },
    fee: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ServiceCatalogue = mongoose.model('ServiceCatalogue', ServiceCatalogueSchema);

const DEFAULT_LPU_SERVICES = [
  {
    code: 'BONAFIDE_CERT',
    name: 'Bonafide Certificate',
    description: 'Official certification of student enrollment at LPU for visa, bank loan, or scholarship applications.',
    department: 'Student Welfare Office',
    requiredDocuments: ['Valid LPU Student ID Card Copy', 'Current Semester Fee Receipt'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 2,
    fee: 0,
  },
  {
    code: 'TRANSCRIPT_REQ',
    name: 'Transcript Request',
    description: 'Consolidated official academic transcript record across all completed terms and grade points.',
    department: 'Examination Cell',
    requiredDocuments: ['All Semester Grade Reports', 'Identity Proof (Aadhaar / Passport)'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 5,
    fee: 250,
  },
  {
    code: 'FEE_RECEIPT_DUPLICATE',
    name: 'Fee Receipt / Duplicate Fee Slip',
    description: 'Certified institutional duplicate payment receipt for tuition, examination, or hostel charges.',
    department: 'Accounts Office',
    requiredDocuments: ['Online Transaction Reference / Bank Statement Proof', 'Student ID Card'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 1,
    fee: 50,
  },
  {
    code: 'CHARACTER_CERT',
    name: 'Character Certificate',
    description: 'Official letter endorsing student conduct, academic discipline, and campus citizenship at LPU.',
    department: 'Student Welfare Office',
    requiredDocuments: ['Proctorial Clearance Form', 'No-Dues Undertaking from Hostel'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 3,
    fee: 0,
  },
  {
    code: 'HOSTEL_GATE_PASS',
    name: 'Hostel Leave / Gate Pass',
    description: 'Formal out-station or overnight hostel leave authorization approved by chief warden / proctor.',
    department: 'Hostel Administration',
    requiredDocuments: ['Parent Consent Undertaking / Consent Email', 'Hostel Mess Card'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 1,
    fee: 0,
  },
  {
    code: 'ID_CARD_REISSUE',
    name: 'ID Card Reissue',
    description: 'Replacement biometric RFID student campus identification card for lost or damaged cards.',
    department: 'Student Welfare Office',
    requiredDocuments: ['Lost Property Report / Self-Declaration', 'Passport Photo', 'Payment Slip'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 4,
    fee: 200,
  },
  {
    code: 'MIGRATION_CERT',
    name: 'Migration Certificate',
    description: 'Official university clearance document required to transfer credits or enroll in another higher-ed institution.',
    department: 'Examination Cell',
    requiredDocuments: ['Final Degree / Provisional Certificate Copy', 'Comprehensive No Dues Certificate'],
    stages: ['Submitted', 'Document Verified', 'Department Approval', 'HOD Approval', 'Certificate Generated'],
    estimatedDays: 7,
    fee: 500,
  },
];

async function seedDefaultServices() {
  for (const s of DEFAULT_LPU_SERVICES) {
    await ServiceCatalogue.findOneAndUpdate(
      { code: s.code },
      { $set: s },
      { upsert: true, new: true }
    );
  }
}

module.exports = {
  ServiceCatalogue,
  DEFAULT_LPU_SERVICES,
  seedDefaultServices,
};
