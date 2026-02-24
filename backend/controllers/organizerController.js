const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { addComputedStatusToArray } = require('../utils/eventStatus');

// @desc    Get organizer dashboard
// @route   GET /api/organizer/dashboard
// @access  Private (Organizer only)
exports.getDashboard = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user._id);
    
    // Get all events with analytics
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });

    // Add computed status to all events based on current time
    const eventsWithComputedStatus = addComputedStatusToArray(events);

    // Get completed events for analytics (use computed status)
    const completedEvents = eventsWithComputedStatus.filter(e => e.status === 'Closed');

    // Calculate analytics - count revenue from ALL events, not just closed ones
    const totalRevenue = eventsWithComputedStatus.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const totalRegistrations = eventsWithComputedStatus.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
    const totalAttendance = eventsWithComputedStatus.reduce((sum, e) => {
      return sum + e.participants.filter(p => p.attendance).length;
    }, 0);

    console.log(' Dashboard Analytics:', {
      totalEvents: eventsWithComputedStatus.length,
      completedEvents: completedEvents.length,
      totalRevenue,
      totalRegistrations,
      totalAttendance,
      revenueByEvent: eventsWithComputedStatus.map(e => ({ name: e.name, revenue: e.revenue }))
    });

    res.status(200).json({
      success: true,
      data: {
        events: eventsWithComputedStatus,
        analytics: {
          totalEvents: eventsWithComputedStatus.length,
          completedEvents: completedEvents.length,
          totalRevenue,
          totalRegistrations,
          totalAttendance,
          followers: organizer.followers.length
        }
      }
    });
  } catch (error) {
    console.error('Get organizer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update organizer profile
// @route   PUT /api/organizer/profile
// @access  Private (Organizer only)
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'name',
      'category',
      'description',
      'contactEmail',
      'contactNumber',
      'discordWebhook'
    ];

    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every(update => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      });
    }

    const organizer = await Organizer.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: organizer
    });
  } catch (error) {
    console.error('Update organizer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get event analytics
// @route   GET /api/organizer/events/:id/analytics
// @access  Private (Organizer only)
exports.getEventAnalytics = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email participantType');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Calculate analytics
    const totalRegistrations = event.participants.length;
    const attendanceCount = event.participants.filter(p => p.attendance).length;
    const revenue = event.revenue || 0;
    
    // Payment status breakdown (for merchandise)
    const paidParticipants = event.participants.filter(p => p.paymentStatus === 'completed').length;
    const pendingPayments = event.participants.filter(p => p.paymentStatus === 'pending').length;
    const rejectedPayments = event.participants.filter(p => p.paymentStatus === 'rejected').length;

    // Team statistics
    const teamParticipants = event.participants.filter(p => p.team);
    const uniqueTeams = [...new Set(teamParticipants.map(p => p.team))];
    const teamStats = {
      totalTeams: uniqueTeams.length,
      completeTeams: 0
    };

    // Calculate complete teams (assuming team size from event or default to 4)
    const teamSize = event.teamSize || 4;
    uniqueTeams.forEach(teamName => {
      const teamMembers = teamParticipants.filter(p => p.team === teamName).length;
      if (teamMembers >= teamSize) {
        teamStats.completeTeams++;
      }
    });

    // Participant breakdown
    const iiitCount = event.participants.filter(
      p => p.participant?.participantType === 'IIIT'
    ).length;
    const nonIiitCount = totalRegistrations - iiitCount;

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations,
        attendanceCount,
        revenue,
        paidParticipants,
        pendingPayments,
        rejectedPayments,
        teamStats: teamParticipants.length > 0 ? teamStats : null,
        viewCount: event.viewCount,
        participantBreakdown: {
          iiit: iiitCount,
          nonIiit: nonIiitCount
        }
      }
    });
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark attendance for participant
// @route   PUT /api/organizer/events/:eventId/attendance/:participantId
// @access  Private (Organizer only)
exports.markAttendance = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const participant = event.participants.find(
      p => p.participant.toString() === req.params.participantId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in event'
      });
    }

    participant.attendance = req.body.attendance;
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all organizers (public)
// @route   GET /api/organizer/all
// @access  Public
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: true })
      .select('-password -discordWebhook')
      .populate('followers', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: organizers
    });
  } catch (error) {
    console.error('Get all organizers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get organizer by ID (public)
// @route   GET /api/organizer/:id
// @access  Public
exports.getOrganizerById = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('-password -discordWebhook')
      .populate('followers', 'firstName lastName email');

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: organizer
    });
  } catch (error) {
    console.error('Get organizer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get organizer events (public)
// @route   GET /api/organizer/:id/events
// @access  Public
exports.getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({
      organizer: req.params.id,
      status: { $in: ['Published', 'Ongoing', 'Closed'] }
    })
      .populate('organizer', 'name category')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Change organizer password
// @route   PUT /api/organizer/change-password
// @access  Private (Organizer only)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get organizer with password
    const organizer = await Organizer.findById(req.user._id).select('+password');

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Verify current password
    const isMatch = await organizer.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    organizer.password = newPassword;
    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Request password reset (organizer submits to admin)
// @route   POST /api/organizer/request-password-reset
// @access  Private (Organizer only)
exports.requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a detailed reason (at least 10 characters)'
      });
    }

    // Check if there's already a pending request
    const existingRequest = await PasswordResetRequest.findOne({
      organizer: req.user._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending password reset request'
      });
    }

    const request = await PasswordResetRequest.create({
      organizer: req.user._id,
      reason: reason.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Password reset request submitted. An admin will review your request.',
      data: {
        requestId: request._id,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get my password reset requests
// @route   GET /api/organizer/my-reset-requests
// @access  Private (Organizer only)
exports.getMyResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({
      organizer: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get reset requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
