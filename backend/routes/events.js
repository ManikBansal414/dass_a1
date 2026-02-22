const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  registerForEvent,
  getOrganizerEvents,
  getEventParticipants,
  deleteEvent,
  getAttendanceData,
  markAttendance,
  manualAttendanceOverride,
  exportAttendanceCSV,
  getMerchandiseOrders,
  approvePayment,
  rejectPayment
} = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (optionalAuth attaches user if logged in, for recommendations)
router.get('/', optionalAuth, getEvents);
router.get('/:id', optionalAuth, getEvent);

// Participant routes
router.post('/:id/register', protect, authorize('participant'), registerForEvent);

// Organizer routes (event creation/management)
router.post('/', protect, authorize('organizer'), createEvent);
router.put('/:id', protect, authorize('organizer', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteEvent);
router.get('/organizer/my-events', protect, authorize('organizer', 'admin'), getOrganizerEvents);
router.get('/:id/participants', protect, authorize('organizer', 'admin'), getEventParticipants);

// Attendance & QR Scanner routes
router.get('/:id/attendance', protect, authorize('organizer', 'admin'), getAttendanceData);
router.post('/:id/mark-attendance', protect, authorize('organizer', 'admin'), markAttendance);
router.post('/:id/manual-override', protect, authorize('organizer', 'admin'), manualAttendanceOverride);
router.get('/:id/export-attendance', protect, authorize('organizer', 'admin'), exportAttendanceCSV);

// Merchandise Payment Approval routes
router.get('/:id/merchandise-orders', protect, authorize('organizer', 'admin'), getMerchandiseOrders);
router.put('/:id/approve-payment/:participantEntryId', protect, authorize('organizer', 'admin'), approvePayment);
router.put('/:id/reject-payment/:participantEntryId', protect, authorize('organizer', 'admin'), rejectPayment);

module.exports = router;
