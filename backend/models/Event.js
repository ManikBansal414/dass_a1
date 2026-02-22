const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['Normal', 'Merchandise']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  registrationLimit: {
    type: Number,
    default: null
  },
  eligibility: {
    type: String,
    enum: ['IIIT', 'Non-IIIT', 'All'],
    default: 'All'
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Ongoing', 'Closed'],
    default: 'Draft'
  },
  // Custom registration form fields
  customFormFields: [{
    fieldName: {
      type: String,
      required: true
    },
    fieldType: {
      type: String,
      enum: ['text', 'dropdown', 'checkbox', 'file', 'number'],
      required: true
    },
    options: [String], // For dropdown
    required: {
      type: Boolean,
      default: false
    },
    order: Number
  }],
  // For merchandise events
  merchandiseDetails: {
    size: [String],
    color: [String],
    variants: [String],
    stockQuantity: Number,
    purchaseLimit: {
      type: Number,
      default: 1
    }
  },
  // Participants registered
  participants: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    customFormData: mongoose.Schema.Types.Mixed,
    ticketId: String,
    team: String,
    attendance: {
      type: Boolean,
      default: false
    },
    attendanceTime: {
      type: Date
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected'],
      default: 'completed'
    },
    // Merchandise payment approval fields
    paymentProof: {
      type: String  // Base64 or URL of uploaded payment screenshot
    },
    paymentProofUploadedAt: {
      type: Date
    },
    merchandiseOptions: {
      size: String,
      color: String,
      variant: String
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    }
  }],
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  registrationCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search and filtering
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });
eventSchema.index({ startDate: 1, eventType: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
