const express = require('express');
const router = express.Router();
const {
  getDashboard,
  updateProfile,
  getEventAnalytics,
  markAttendance,
  getOrganizerById,
  getOrganizerEvents,
  getAllOrganizers,
  requestPasswordReset,
  getMyResetRequests
} = require('../controllers/organizerController');
const { protect, authorize } = require('../middleware/auth');

// Public routes - specific routes first
router.get('/all', getAllOrganizers);

// Protected routes (require authentication as organizer)
// IMPORTANT: These must come BEFORE /:id routes to avoid conflicts
router.get('/dashboard', protect, authorize('organizer'), getDashboard);
router.put('/profile', protect, authorize('organizer'), updateProfile);
router.post('/request-password-reset', protect, authorize('organizer'), requestPasswordReset);
router.get('/my-reset-requests', protect, authorize('organizer'), getMyResetRequests);
router.get('/events/:id/analytics', protect, authorize('organizer'), getEventAnalytics);
router.put('/events/:eventId/attendance/:participantId', protect, authorize('organizer'), markAttendance);

// Public parameterized routes (must come AFTER specific routes)
router.get('/:id', getOrganizerById);
router.get('/:id/events', getOrganizerEvents);

module.exports = router;
