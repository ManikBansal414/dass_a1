const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const participantSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  participantType: {
    type: String,
    enum: ['IIIT', 'Non-IIIT'],
    required: true
  },
  college: {
    type: String,
    required: function() {
      return this.participantType === 'Non-IIIT';
    }
  },
  contactNumber: {
    type: String,
    required: true
  },
  // User onboarding preferences
  areasOfInterest: [{
    type: String
  }],
  followedClubs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer'
  }],
  // Participation history
  registeredEvents: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    },
    ticketId: String,
    qrCode: String,
    team: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    }
  }],
  role: {
    type: String,
    default: 'participant'
  }
}, {
  timestamps: true
});

// Hash password before saving
participantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
participantSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Participant', participantSchema);
