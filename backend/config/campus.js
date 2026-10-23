/**
 * Lovely Professional University (LPU) Master Campus Configuration
 * Centralized master data reused across CampusX modules
 */

module.exports = {
  university: {
    name: 'Lovely Professional University',
    shortName: 'LPU',
    tagline: 'Transforming Education, Transforming India',
    location: 'Phagwara, Punjab, India - 144411',
    branding: {
      primaryColor: '#7a1c2d', // Deep LPU Maroon / Burgundy
      secondaryColor: '#f59e0b', // LPU Warm Gold
      accentDark: '#4a0e19',
    },
  },

  // Academic Blocks across the LPU Campus
  academicBlocks: [
    'Block 32',
    'Block 33',
    'Block 34',
    'Block 36',
    'Block 38',
    'Block 55',
    'Block 56',
    'UniMall',
    'Block 13 (Central Library)',
    'Block 25 (Auditorium & Administration)',
    'Block 29 (Law & Management)',
  ],

  // Residential Hostels
  hostels: {
    boys: [
      'BH-1',
      'BH-2',
      'BH-3',
      'BH-4',
      'BH-5',
      'BH-6',
      'BH-7',
      'BH-8',
    ],
    girls: [
      'GH-1',
      'GH-2',
      'GH-3',
      'GH-4',
      'GH-5',
      'GH-6',
    ],
  },

  // Academic & Operational Departments
  departments: [
    'School of Computer Science & Engineering',
    'Student Welfare',
    'Accounts/Finance',
    'Examination Cell',
    'IT Services',
    'Maintenance/Electrical',
    'Housekeeping',
    'Security',
    'Hostel Administration',
  ],

  // Common Service & Administrative Offices
  commonServiceOffices: [
    'Accounts Office',
    'Examination Cell',
    'Student Welfare Office',
    'HOD Office',
    'Chief Warden Office',
    'Division of Student Affairs (DSA)',
  ],
};
