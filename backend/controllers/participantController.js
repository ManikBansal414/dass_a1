const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');

// @desc    Get participant dashboard
// @route   GET /api/participant/dashboard
// @access  Private (Participant only)
exports.getDashboard = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id)
      .populate({
        path: 'registeredEvents.event',
        populate: { path: 'organizer', select: 'name category' }
      })
      .populate('followedClubs', 'name category description');

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    console.log('Dashboard - Participant areasOfInterest:', participant.areasOfInterest);
    console.log('Dashboard - Participant areasOfInterest length:', participant.areasOfInterest?.length);

    // Separate upcoming and past events (registered events)
    const now = new Date();
    const upcomingEvents = participant.registeredEvents.filter(
      re => re.event && new Date(re.event.startDate) > now
    );
    const pastEvents = participant.registeredEvents.filter(
      re => re.event && new Date(re.event.startDate) <= now
    );

    // Get all available upcoming events (not registered)
    const registeredEventIds = participant.registeredEvents
      .filter(re => re.event)
      .map(re => re.event._id.toString());

    const availableEvents = await Event.find({
      status: 'Published',
      startDate: { $gt: now },
      _id: { $nin: registeredEventIds }
    })
      .populate('organizer', 'name category')
      .sort({ startDate: 1 })
      .limit(10);

    console.log('Dashboard - Available events count:', availableEvents.length);
    console.log('Dashboard - Available events types:', availableEvents.map(e => e.eventType));

    res.status(200).json({
      success: true,
      data: {
        firstName: participant.firstName,
        lastName: participant.lastName,
        upcomingEvents,
        pastEvents,
        availableEvents,
        followedClubs: participant.followedClubs,
        areasOfInterest: participant.areasOfInterest,
        allEvents: participant.registeredEvents
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get participant profile
// @route   GET /api/participant/profile
// @access  Private (Participant only)
exports.getProfile = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id)
      .select('-password')
      .populate('followedClubs', 'name category description');

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: participant
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update participant profile
// @route   PUT /api/participant/profile
// @access  Private (Participant only)
exports.updateProfile = async (req, res) => {
  try {
    console.log('Update profile request body:', req.body);
    console.log('Areas of Interest received:', req.body.areasOfInterest);
    
    const allowedUpdates = [
      'firstName',
      'lastName',
      'contactNumber',
      'college',
      'areasOfInterest',
      'followedClubs'
    ];

    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every(update => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      });
    }

    const participant = await Participant.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('Updated participant:', participant);
    console.log('Saved areasOfInterest:', participant.areasOfInterest);

    res.status(200).json({
      success: true,
      data: participant
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Change participant password
// @route   PUT /api/participant/change-password
// @access  Private (Participant only)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get participant with password field
    const participant = await Participant.findById(req.user._id).select('+password');

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Verify current password
    const isPasswordMatch = await participant.comparePassword(currentPassword);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    participant.password = newPassword;
    await participant.save();

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

// @desc    Follow/Unfollow club
// @route   POST /api/participant/follow/:organizerId
// @access  Private (Participant only)
exports.toggleFollowClub = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id);
    const organizer = await Organizer.findById(req.params.organizerId);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Club/Organizer not found'
      });
    }

    const isFollowing = participant.followedClubs.includes(req.params.organizerId);

    if (isFollowing) {
      // Unfollow
      participant.followedClubs = participant.followedClubs.filter(
        id => id.toString() !== req.params.organizerId
      );
      organizer.followers = organizer.followers.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      // Follow
      participant.followedClubs.push(req.params.organizerId);
      organizer.followers.push(req.user._id);
    }

    await participant.save();
    await organizer.save();

    res.status(200).json({
      success: true,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowing: !isFollowing
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all clubs/organizers
// @route   GET /api/participant/clubs
// @access  Public
exports.getClubs = async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: true })
      .select('name category description contactEmail followers')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: organizers.length,
      data: organizers
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get organizer details
// @route   GET /api/participant/clubs/:id
// @access  Public
exports.getClubDetails = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('-password');

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Club/Organizer not found'
      });
    }

    // Get organizer's events
    const upcomingEvents = await Event.find({
      organizer: req.params.id,
      status: 'Published',
      startDate: { $gte: new Date() }
    }).sort({ startDate: 1 });

    const pastEvents = await Event.find({
      organizer: req.params.id,
      status: { $in: ['Published', 'Closed'] },
      startDate: { $lt: new Date() }
    }).sort({ startDate: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        organizer,
        upcomingEvents,
        pastEvents
      }
    });
  } catch (error) {
    console.error('Get club details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
