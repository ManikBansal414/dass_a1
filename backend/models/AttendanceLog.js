const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  ticketId: {
    type: String,
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'markedByRole'
  },
  markedByRole: {
    type: String,
    enum: ['organizer', 'admin'],
    required: true
  },
  method: {
    type: String,
    enum: ['camera', 'upload', 'manual', 'manual_override'],
    required: true
  },
  action: {
    type: String,
    enum: ['mark', 'unmark'],
    default: 'mark'
  },
  reason: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceLogSchema.index({ event: 1, timestamp: -1 });
attendanceLogSchema.index({ participant: 1 });

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);
