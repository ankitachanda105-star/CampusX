const mongoose = require('mongoose');

const AssetMaintenanceLogSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampusAsset',
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      index: true,
    },
    assetName: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    technicianName: {
      type: String,
      required: true,
    },
    actionTaken: {
      type: String,
      required: true,
      trim: true,
    },
    partsReplaced: [
      {
        type: String,
      },
    ],
    serviceCost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    previousRiskScore: {
      type: Number,
      default: 0,
    },
    newRiskScore: {
      type: Number,
      default: 0,
    },
    servicedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const AssetMaintenanceLog = mongoose.model('AssetMaintenanceLog', AssetMaintenanceLogSchema);

module.exports = {
  AssetMaintenanceLog,
};
