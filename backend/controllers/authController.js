const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const { sendTokenResponse } = require('../utils/auth');

// @desc    Register participant
// @route   POST /api/auth/register
// @access  Public
exports.registerParticipant = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType,
      college,
      contactNumber
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !participantType || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate IIIT email for IIIT participants
    const validIIITDomains = ['@iiit.ac.in', '@students.iiit.ac.in', '@research.iiit.ac.in'];
    const isValidIIITEmail = validIIITDomains.some(domain => email.endsWith(domain));
    
    if (participantType === 'IIIT' && !isValidIIITEmail) {
      return res.status(400).json({
        success: false,
        message: 'IIIT participants must use IIIT-issued email ID (@iiit.ac.in, @students.iiit.ac.in, or @research.iiit.ac.in)'
      });
    }

    // Check if user already exists
    const existingUser = await Participant.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create participant
    const participant = await Participant.create({
      firstName,
      lastName,
      email,
      password,
      participantType,
      college: participantType === 'Non-IIIT' ? college : undefined,
      contactNumber
    });

    sendTokenResponse(participant, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user (Participant/Organizer/Admin)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    let user;
    let userRole;

    // Determine which collection to search based on role hint or try all
    if (role === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
      userRole = 'admin';
    } else if (role === 'organizer') {
      user = await Organizer.findOne({ email }).select('+password');
      userRole = 'organizer';
    } else {
      // Try participant first, then organizer, then admin
      user = await Participant.findOne({ email }).select('+password');
      if (user) {
        userRole = 'participant';
      } else {
        user = await Organizer.findOne({ email }).select('+password');
        if (user) {
          userRole = 'organizer';
        } else {
          user = await Admin.findOne({ email }).select('+password');
          userRole = 'admin';
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if organizer is active
    if (userRole === 'organizer' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};
