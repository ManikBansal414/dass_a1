const Discussion = require('../models/Discussion');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

// @desc    Get all discussions for an event
// @route   GET /api/events/:eventId/discussions
// @access  Private (Registered participants + Organizer)
exports.getDiscussions = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is registered or is organizer
    const isOrganizer = req.userRole === 'organizer' && event.organizer.toString() === req.user._id.toString();
    const isRegistered = event.participants.some(p => p.participant.toString() === req.user._id.toString());
    
    if (!isOrganizer && !isRegistered && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only registered participants can access discussions'
      });
    }

    const discussions = await Discussion.find({ event: eventId, deleted: false })
      .populate('author', 'firstName lastName name email')
      .populate('parentMessage')
      .sort({ isPinned: -1, createdAt: -1 });

    // Get reply counts
    const discussionsWithReplies = await Promise.all(
      discussions.map(async (disc) => {
        const replyCount = await Discussion.countDocuments({
          parentMessage: disc._id,
          deleted: false
        });
        return {
          ...disc.toObject(),
          replyCount
        };
      })
    );

    res.status(200).json({
      success: true,
      discussions: discussionsWithReplies
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Post a new message
// @route   POST /api/events/:eventId/discussions
// @access  Private (Registered participants + Organizer)
exports.postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { message, parentMessage, isAnnouncement } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is registered or is organizer
    const isOrganizer = req.userRole === 'organizer' && event.organizer.toString() === req.user._id.toString();
    const isRegistered = event.participants.some(p => p.participant.toString() === req.user._id.toString());
    
    if (!isOrganizer && !isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'Only registered participants can post messages'
      });
    }

    // Only organizers can post announcements
    if (isAnnouncement && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can post announcements'
      });
    }

    const discussion = new Discussion({
      event: eventId,
      author: req.user._id,
      authorModel: req.userRole === 'organizer' ? 'Organizer' : 'Participant',
      message,
      parentMessage: parentMessage || null,
      isAnnouncement: isAnnouncement && isOrganizer
    });

    await discussion.save();
    await discussion.populate('author', 'firstName lastName name email');

    res.status(201).json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Pin/Unpin a message
// @route   PUT /api/events/:eventId/discussions/:id/pin
// @access  Private (Organizer only)
exports.togglePin = async (req, res) => {
  try {
    const { eventId, id } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Only organizer can pin
    if (req.userRole !== 'organizer' || event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can pin messages'
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.status(200).json({
      success: true,
      isPinned: discussion.isPinned
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/events/:eventId/discussions/:id
// @access  Private (Organizer only)
exports.deleteMessage = async (req, res) => {
  try {
    const { eventId, id } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Only organizer can delete
    if (req.userRole !== 'organizer' || event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can delete messages'
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    discussion.deleted = true;
    discussion.deletedBy = req.user._id;
    discussion.deletedAt = new Date();
    await discussion.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    React to a message
// @route   POST /api/events/:eventId/discussions/:id/react
// @access  Private (Registered participants + Organizer)
exports.reactToMessage = async (req, res) => {
  try {
    const { eventId, id } = req.params;
    const { emoji } = req.body;

    const validEmojis = ['👍', '❤️', '🎉', '🤔', '👏'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emoji'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user already reacted
    const existingReactionIndex = discussion.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReactionIndex !== -1) {
      // Update existing reaction
      discussion.reactions[existingReactionIndex].emoji = emoji;
    } else {
      // Add new reaction
      discussion.reactions.push({
        user: req.user._id,
        userModel: req.userRole === 'organizer' ? 'Organizer' : 'Participant',
        emoji
      });
    }

    await discussion.save();

    res.status(200).json({
      success: true,
      reactions: discussion.reactions
    });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove reaction from a message
// @route   DELETE /api/events/:eventId/discussions/:id/react
// @access  Private (Registered participants + Organizer)
exports.removeReaction = async (req, res) => {
  try {
    const { eventId, id } = req.params;

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    discussion.reactions = discussion.reactions.filter(
      r => r.user.toString() !== req.user._id.toString()
    );

    await discussion.save();

    res.status(200).json({
      success: true,
      reactions: discussion.reactions
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Edit a message
// @route   PUT /api/events/:eventId/discussions/:id
// @access  Private (Message author only, within 15 minutes)
exports.editMessage = async (req, res) => {
  try {
    const { eventId, id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the author
    if (discussion.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is within 15 minutes old
    const messageAge = Date.now() - new Date(discussion.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    
    if (messageAge > fifteenMinutes) {
      return res.status(403).json({
        success: false,
        message: 'Messages can only be edited within 15 minutes of posting'
      });
    }

    discussion.message = message.trim();
    discussion.edited = true;
    discussion.editedAt = new Date();
    await discussion.save();
    await discussion.populate('author', 'firstName lastName name email');

    res.status(200).json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
