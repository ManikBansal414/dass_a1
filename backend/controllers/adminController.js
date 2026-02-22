const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const Event = require('../models/Event');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/auth');

// @desc    Create organizer account
// @route   POST /api/admin/organizers
// @access  Private (Admin only)
exports.createOrganizer = async (req, res) => {
  try {
    const { name, category, description, contactEmail, contactNumber } = req.body;

    // Auto-generate email from organizer name
    const email = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      + '@felicity.com';

    // Check if organizer already exists
    const existingOrganizer = await Organizer.findOne({ email });
    if (existingOrganizer) {
      return res.status(400).json({
        success: false,
        message: 'An organizer with similar name already exists'
      });
    }

    // Auto-generate password
    const password = 'temp' + Math.random().toString(36).slice(-8);

    // Create organizer (password will be hashed by pre-save hook)
    const organizer = await Organizer.create({
      name,
      category,
      description,
      email,
      password: password,  // Plain password - will be hashed by model
      contactEmail: contactEmail || email,
      contactNumber
    });

    res.status(201).json({
      success: true,
      message: 'Organizer created successfully',
      data: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        temporaryPassword: password,
        message: 'Share these credentials with the organizer. They should change the password after first login.'
      }
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
// @access  Private (Admin only)
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: organizers.length,
      data: organizers
    });
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove/Disable organizer
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin only)
exports.removeOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Option to archive or permanently delete
    const { permanent } = req.query;

    if (permanent === 'true') {
      // CASCADE DELETE: Delete all events created by this organizer
      await Event.deleteMany({ organizer: req.params.id });
      console.log(`🗑️ Cascade deleted all events for organizer ${req.params.id}`);
      
      await Organizer.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Organizer and all their events permanently deleted'
      });
    } else {
      organizer.isActive = false;
      await organizer.save();
      return res.status(200).json({
        success: true,
        message: 'Organizer account deactivated'
      });
    }
  } catch (error) {
    console.error('Remove organizer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reactivate organizer
// @route   PUT /api/admin/organizers/:id/reactivate
// @access  Private (Admin only)
exports.reactivateOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    organizer.isActive = true;
    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Organizer reactivated successfully',
      data: organizer
    });
  } catch (error) {
    console.error('Reactivate organizer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Handle password reset requests
// @route   POST /api/admin/password-reset
// @access  Private (Admin only)
exports.resetOrganizerPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const organizer = await Organizer.findOne({ email });

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Generate new temporary password
    const newPassword = 'reset' + Math.random().toString(36).slice(-8);
    organizer.password = newPassword;  // Plain password - will be hashed by pre-save hook
    await organizer.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        email: organizer.email,
        temporaryPassword: newPassword
      }
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
exports.getDashboard = async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Participant = require('../models/Participant');

    const totalOrganizers = await Organizer.countDocuments();
    const activeOrganizers = await Organizer.countDocuments({ isActive: true });
    const totalEvents = await Event.countDocuments();
    const totalParticipants = await Participant.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalOrganizers,
        activeOrganizers,
        totalEvents,
        totalParticipants
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all events (Admin view)
// @route   GET /api/admin/events
// @access  Private (Admin only)
exports.getAllEvents = async (req, res) => {
  try {
    const Event = require('../models/Event');
    
    const events = await Event.find()
      .populate('organizer', 'name category email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all password reset requests
// @route   GET /api/admin/password-reset-requests
// @access  Private (Admin only)
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const requests = await PasswordResetRequest.find(query)
      .populate('organizer', 'name email category')
      .populate('processedBy', 'email')
      .sort({ createdAt: -1 });

    const stats = {
      total: await PasswordResetRequest.countDocuments(),
      pending: await PasswordResetRequest.countDocuments({ status: 'pending' }),
      approved: await PasswordResetRequest.countDocuments({ status: 'approved' }),
      rejected: await PasswordResetRequest.countDocuments({ status: 'rejected' })
    };

    res.status(200).json({
      success: true,
      data: requests,
      stats
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve a password reset request
// @route   PUT /api/admin/password-reset-requests/:id/approve
// @access  Private (Admin only)
exports.approvePasswordResetRequest = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate('organizer', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Generate new temporary password
    const newPassword = 'reset' + Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

    // Update organizer's password
    const organizer = await Organizer.findById(request.organizer._id);
    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    organizer.password = newPassword; // Will be hashed by pre-save hook
    await organizer.save();

    // Update request status
    request.status = 'approved';
    request.newPassword = newPassword;
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    request.adminComments = req.body.comments || 'Approved';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Password reset approved',
      data: {
        organizerName: request.organizer.name,
        organizerEmail: request.organizer.email,
        temporaryPassword: newPassword
      }
    });
  } catch (error) {
    console.error('Approve password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reject a password reset request
// @route   PUT /api/admin/password-reset-requests/:id/reject
// @access  Private (Admin only)
exports.rejectPasswordResetRequest = async (req, res) => {
  try {
    const { comments } = req.body;

    const request = await PasswordResetRequest.findById(req.params.id)
      .populate('organizer', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    request.status = 'rejected';
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    request.adminComments = comments || 'Rejected';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Password reset request rejected'
    });
  } catch (error) {
    console.error('Reject password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
