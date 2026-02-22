const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getProfile,
  updateProfile,
  changePassword,
  toggleFollowClub,
  getClubs,
  getClubDetails
} = require('../controllers/participantController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/clubs', getClubs);
router.get('/clubs/:id', getClubDetails);

// Protected routes - require authentication as participant
router.use(protect);
router.use(authorize('participant'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/follow/:organizerId', toggleFollowClub);

module.exports = router;
