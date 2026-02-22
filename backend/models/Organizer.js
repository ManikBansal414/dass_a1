const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const organizerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Cultural', 'Technical', 'Sports']
  },
  description: {
    type: String,
    required: true
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
  contactEmail: {
    type: String,
    required: true
  },
  contactNumber: String,
  // Discord webhook for auto-posting events
  discordWebhook: String,
  // Events created by this organizer
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'organizer'
  }
}, {
  timestamps: true
});

// Hash password before saving
organizerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
organizerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Organizer', organizerSchema);
