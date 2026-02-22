const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access eventId from parent router
const {
  getDiscussions,
  postMessage,
  togglePin,
  deleteMessage,
  reactToMessage,
  removeReaction
} = require('../controllers/discussionController');
const { protect, authorize } = require('../middleware/auth');

// All discussion routes require authentication
router.use(protect);

// Get all discussions for an event
router.get('/', getDiscussions);

// Post a new message
router.post('/', authorize('participant', 'organizer'), postMessage);

// Pin/Unpin a message
router.put('/:id/pin', authorize('organizer'), togglePin);

// Delete a message
router.delete('/:id', authorize('organizer'), deleteMessage);

// React to a message
router.post('/:id/react', authorize('participant', 'organizer'), reactToMessage);
router.delete('/:id/react', authorize('participant', 'organizer'), removeReaction);

module.exports = router;
