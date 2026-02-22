const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res) => {
  const token = this.generateToken(user._id, user.role);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name || `${user.firstName} ${user.lastName}`
    }
  });
};
