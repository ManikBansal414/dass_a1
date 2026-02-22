const express = require('express');
const router = express.Router();
const {
  registerParticipant,
  login,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerParticipant);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
