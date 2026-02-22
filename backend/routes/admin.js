const express = require('express');
const router = express.Router();
const {
  createOrganizer,
  getAllOrganizers,
  removeOrganizer,
  reactivateOrganizer,
  resetOrganizerPassword,
  getDashboard,
  getAllEvents,
  getPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication as admin
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/events', getAllEvents);
router.post('/organizers', createOrganizer);
router.get('/organizers', getAllOrganizers);
router.delete('/organizers/:id', removeOrganizer);
router.put('/organizers/:id/reactivate', reactivateOrganizer);
router.post('/password-reset', resetOrganizerPassword);
router.get('/password-reset-requests', getPasswordResetRequests);
router.put('/password-reset-requests/:id/approve', approvePasswordResetRequest);
router.put('/password-reset-requests/:id/reject', rejectPasswordResetRequest);

module.exports = router;
