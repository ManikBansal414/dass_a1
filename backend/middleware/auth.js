const jwt = require('jsonwebtoken');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on role
    let user;
    if (decoded.role === 'participant') {
      user = await Participant.findById(decoded.id).select('-password');
    } else if (decoded.role === 'organizer') {
      user = await Organizer.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if organizer is active
    if (decoded.role === 'organizer' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.userRole} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional auth - attach user if token exists, but don't block if not
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'participant') {
      user = await Participant.findById(decoded.id).select('-password');
    } else if (decoded.role === 'organizer') {
      user = await Organizer.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    }

    if (user) {
      req.user = user;
      req.userRole = decoded.role;
    }
  } catch (error) {
    // Token invalid, continue without user
  }

  next();
};
