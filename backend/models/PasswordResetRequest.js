const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminComments: {
    type: String,
    trim: true
  },
  newPassword: {
    type: String  // Generated on approval, stored temporarily
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
passwordResetRequestSchema.index({ status: 1, createdAt: -1 });
passwordResetRequestSchema.index({ organizer: 1, status: 1 });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
