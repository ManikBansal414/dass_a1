const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const { generateTicketId, generateQRCode } = require('../utils/ticket');
const { sendTicketEmail, sendMerchandiseEmail, sendMerchandisePendingEmail, sendMerchandiseApprovalEmail, sendMerchandiseRejectionEmail } = require('../utils/email');
const AttendanceLog = require('../models/AttendanceLog');
const { sendDiscordNotification } = require('../utils/discord');
const { addComputedStatus, addComputedStatusToArray } = require('../utils/eventStatus');

// @desc    Get all events with filters
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const {
      search,
      eventType,
      eligibility,
      dateFrom,
      dateTo,
      followedClubs,
      trending,
      recommended,
      page = 1,
      limit = 10
    } = req.query;

    let query = { status: 'Published' };

    // Search by name/description/organizer with fuzzy matching
    if (search) {
      // Find organizers matching the search term
      const matchingOrganizers = await Organizer.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      
      const organizerIds = matchingOrganizers.map(o => o._id);
      
      // Use MongoDB text search for fuzzy matching on indexed fields
      // OR match organizers by name
      query.$or = [
        { $text: { $search: search } },
        { organizer: { $in: organizerIds } }
      ];
    }

    // Filter by event type
    if (eventType) {
      query.eventType = eventType;
    }

    // Filter by eligibility
    if (eligibility) {
      query.eligibility = { $in: [eligibility, 'All'] };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    let events;
    
    if (trending === 'true') {
      // Get trending events (Top 5 by views in last 24 hours)
      events = await Event.find(query)
        .sort({ viewCount: -1 })
        .limit(5)
        .populate('organizer', 'name category');
    } else if (recommended === 'true' && req.user) {
      // Get personalized recommendations based on user preferences
      const participant = await Participant.findById(req.user._id);
      
      if (participant) {
        // Build scoring pipeline for recommendations
        const pipeline = [
          { $match: query },
          {
            $addFields: {
              score: {
                $add: [
                  // Score boost for followed clubs (40 points)
                  {
                    $cond: [
                      { $in: ['$organizer', participant.followedClubs] },
                      40,
                      0
                    ]
                  },
                  // Score boost for matching interests in tags (30 points per match)
                  {
                    $multiply: [
                      {
                        $size: {
                          $setIntersection: [
                            '$tags',
                            participant.areasOfInterest || []
                          ]
                        }
                      },
                      30
                    ]
                  },
                  // Score boost for recent events (10 points if within 7 days)
                  {
                    $cond: [
                      {
                        $lte: [
                          '$startDate',
                          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        ]
                      },
                      10,
                      0
                    ]
                  }
                ]
              }
            }
          },
          { $sort: { score: -1, startDate: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: parseInt(limit) }
        ];
        
        events = await Event.aggregate(pipeline);
        
        // Populate organizer details after aggregation
        await Event.populate(events, { path: 'organizer', select: 'name category' });
      } else {
        // Fallback to default sorting if no participant found
        const skip = (page - 1) * limit;
        events = await Event.find(query)
          .populate('organizer', 'name category')
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(parseInt(limit));
      }
    } else if (followedClubs === 'true' && req.user) {
      // Filter by followed clubs only
      const participant = await Participant.findById(req.user._id);
      if (participant && participant.followedClubs.length > 0) {
        query.organizer = { $in: participant.followedClubs };
      } else {
        // If user has no followed clubs, return empty array
        query.organizer = { $in: [] }; // This will match no documents
      }
      
      const skip = (page - 1) * limit;
      events = await Event.find(query)
        .populate('organizer', 'name category')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      // Default: Pagination without recommendations
      const skip = (page - 1) * limit;
      
      events = await Event.find(query)
        .populate('organizer', 'name category')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await Event.countDocuments(query);

    // Add computed status to all events based on current time
    const eventsWithComputedStatus = addComputedStatusToArray(events);

    res.status(200).json({
      success: true,
      count: eventsWithComputedStatus.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: eventsWithComputedStatus
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name category description contactEmail');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    event.viewCount += 1;
    await event.save();

    // Add computed status based on current time vs event dates
    const eventWithComputedStatus = addComputedStatus(event);

    res.status(200).json({
      success: true,
      data: eventWithComputedStatus
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private (Organizer only)
exports.createEvent = async (req, res) => {
  try {
    // Determine organizer ID (organizers use their own ID, admins can specify)
    const organizerId = req.userRole === 'admin' && req.body.organizer 
      ? req.body.organizer 
      : req.user._id;

    const eventData = {
      ...req.body,
      organizer: organizerId,
      status: req.body.status || 'Draft' // Respect the status from request, default to Draft
    };

    const event = await Event.create(eventData);

    // Send Discord notification if event is published
    if (event.status === 'Published') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(event.organizer);
      if (organizer && organizer.discordWebhook) {
        sendDiscordNotification(organizer.discordWebhook, event, organizer)
          .catch(err => console.error('Discord notification failed:', err));
      }
    }

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer - own events, Admin - all events)
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer of this event (admins can edit any event)
    if (req.userRole !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Editing Rules based on event status
    if (event.status === 'Draft') {
      // Draft: Free edits, can be published
      // No restrictions - all fields can be updated
    } else if (event.status === 'Published') {
      // Published: Limited edits - description, deadline, limit, close registrations
      const allowedUpdates = [
        'description',
        'registrationDeadline',
        'registrationLimit',
        'status' // Can close registrations or mark as ongoing
      ];
      const updates = Object.keys(req.body);
      const hasInvalidUpdates = updates.some(update => !allowedUpdates.includes(update));
      
      if (hasInvalidUpdates) {
        return res.status(400).json({
          success: false,
          message: 'For Published events, you can only update: description, registration deadline, registration limit, or status'
        });
      }

      // Validate deadline extension (can't reduce deadline)
      if (req.body.registrationDeadline && new Date(req.body.registrationDeadline) < new Date(event.registrationDeadline)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reduce registration deadline for published events'
        });
      }

      // Validate limit increase (can't reduce limit below current registrations)
      if (req.body.registrationLimit !== undefined) {
        const newLimit = parseInt(req.body.registrationLimit);
        if (newLimit < event.registrationCount) {
          return res.status(400).json({
            success: false,
            message: `Cannot set limit below current registrations (${event.registrationCount})`
          });
        }
      }

      // Lock custom form fields after first registration
      if (event.registrationCount > 0 && req.body.customFormFields) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify custom form fields after first registration'
        });
      }
    } else if (['Ongoing', 'Closed'].includes(event.status)) {
      // Ongoing/Closed: Only status change allowed
      const allowedUpdates = ['status'];
      const updates = Object.keys(req.body);
      const isValidUpdate = updates.every(update => allowedUpdates.includes(update));
      
      if (!isValidUpdate) {
        return res.status(400).json({
          success: false,
          message: 'For Ongoing/Closed events, you can only update status'
        });
      }
    }

    // Prevent editing if event is ongoing or closed (except status change)
    if (['Ongoing', 'Closed'].includes(event.status)) {
      // This block is now redundant as we handle it above, but keeping for safety
      const allowedUpdates = ['status'];
      const updates = Object.keys(req.body);
      const isValidUpdate = updates.every(update => allowedUpdates.includes(update));
      
      if (!isValidUpdate) {
        return res.status(400).json({
          success: false,
          message: 'Can only update status for ongoing/completed events'
        });
      }
    }

    // Update the event
    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Send Discord notification when event is published
    if (req.body.status === 'Published') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(event.organizer);
      if (organizer && organizer.discordWebhook) {
        sendDiscordNotification(organizer.discordWebhook, event, organizer)
          .catch(err => console.error('Discord notification failed:', err));
      }
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private (Participant only)
exports.registerForEvent = async (req, res) => {
  try {
    console.log('📝 Registration attempt:', {
      eventId: req.params.id,
      userId: req.user._id,
      eventType: req.body.eventType,
      hasPaymentProof: !!req.body.paymentProof
    });

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is published
    if (event.status !== 'Published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not open for registration'
      });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check registration limit
    if (event.registrationLimit && event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({
        success: false,
        message: 'Registration limit reached'
      });
    }

    // Check if already registered
    const alreadyRegistered = event.participants.some(
      p => p.participant.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // For Merchandise events: Check stock availability
    if (event.eventType === 'Merchandise') {
      if (event.merchandiseDetails && event.merchandiseDetails.stockQuantity !== undefined) {
        const currentStock = event.merchandiseDetails.stockQuantity;
        
        if (currentStock <= 0) {
          return res.status(400).json({
            success: false,
            message: 'This merchandise is out of stock'
          });
        }

        console.log(`📦 Current stock: ${currentStock}`);
      }
    }

    // Check eligibility
    const participant = await Participant.findById(req.user._id);
    if (event.eligibility === 'IIIT' && participant.participantType !== 'IIIT') {
      return res.status(403).json({
        success: false,
        message: 'This event is only for IIIT students'
      });
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const qrData = {
      ticketId,
      eventId: event._id,
      participantId: req.user._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      eventName: event.name,
      eventDate: event.startDate
    };
    const qrCode = await generateQRCode(qrData);

    // Determine payment status based on event type and payment proof
    const isMerchandiseWithApproval = event.eventType === 'Merchandise' && req.body.paymentProof;
    const paymentStatus = isMerchandiseWithApproval ? 'pending' : 'completed';

    console.log('💳 Payment status:', {
      eventType: event.eventType,
      hasPaymentProof: !!req.body.paymentProof,
      paymentStatus
    });

    // For Merchandise events: Decrement stock ONLY if payment is completed immediately (no approval needed)
    // If payment approval is required, stock will be decremented upon approval
    if (event.eventType === 'Merchandise' && !isMerchandiseWithApproval && event.merchandiseDetails && event.merchandiseDetails.stockQuantity !== undefined) {
      event.merchandiseDetails.stockQuantity -= 1;
      console.log(`📦 Stock decremented immediately (no approval needed). New stock: ${event.merchandiseDetails.stockQuantity}`);
    }

    // Add participant to event
    event.participants.push({
      participant: req.user._id,
      customFormData: req.body.customFormData || {},
      ticketId,
      team: req.body.team,
      paymentStatus,
      paymentProof: req.body.paymentProof || null,
      paymentProofUploadedAt: req.body.paymentProof ? new Date() : null,
      merchandiseOptions: {
        size: req.body.size,
        color: req.body.color,
        variant: req.body.variant
      }
    });

    event.registrationCount += 1;
    if (!isMerchandiseWithApproval) {
      event.revenue += event.registrationFee;
    }
    await event.save();
    console.log('✅ Event saved with participant');

    // Add event to participant's registered events
    participant.registeredEvents.push({
      event: event._id,
      ticketId,
      qrCode: isMerchandiseWithApproval ? null : qrCode, // QR only after approval for merchandise
      team: req.body.team,
      status: 'registered', // Always use 'registered', paymentStatus tracks approval
      paymentStatus: paymentStatus // 'pending' or 'completed'
    });
    await participant.save();
    console.log('✅ Participant saved with event');

    // Send confirmation email asynchronously (don't block response)
    console.log(`📧 Preparing to send email to ${participant.email}...`);
    
    const sendEmailAsync = async () => {
      try {
        if (event.eventType === 'Normal') {
          // For Normal Events: Send ticket email with QR code immediately
          console.log('📨 Sending Normal event ticket email...');
          await sendTicketEmail(participant.email, event, { ticketId, qrCode });
        } else if (event.eventType === 'Merchandise' && isMerchandiseWithApproval) {
          // For Merchandise Events with payment proof: Send pending email
          console.log('📨 Sending Merchandise pending email...');
          await sendMerchandisePendingEmail(participant.email, event, { orderId: ticketId });
        } else if (event.eventType === 'Merchandise') {
          // For Merchandise Events (Basic Flow): Send order confirmation with QR code
          console.log('📨 Sending Merchandise confirmation email...');
          const orderDetails = {
            size: req.body.size,
            color: req.body.color,
            variant: req.body.variant
          };
          await sendMerchandiseEmail(participant.email, event, { ticketId, qrCode }, orderDetails);
        }
        console.log(`✅ Email sent successfully to ${participant.email}`);
      } catch (emailError) {
        console.error(`❌ Email sending failed for ${participant.email}:`, emailError.message);
        console.error('Full error:', emailError);
      }
    };
    
    // Send email in background without blocking the response
    sendEmailAsync().catch(err => console.error('Background email error:', err));

    console.log('✅ Sending success response to client');
    res.status(200).json({
      success: true,
      message: isMerchandiseWithApproval 
        ? 'Order submitted! Payment proof is under review.' 
        : 'Registration successful',
      data: {
        ticketId,
        qrCode: isMerchandiseWithApproval ? null : qrCode,
        paymentStatus
      }
    });
  } catch (error) {
    console.error('❌ Register for event error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/organizer/my-events
// @access  Private (Organizer only)
exports.getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });

    // Add computed status to all events
    const eventsWithComputedStatus = addComputedStatusToArray(events);

    res.status(200).json({
      success: true,
      count: eventsWithComputedStatus.length,
      data: eventsWithComputedStatus
    });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get event participants (Organizer view)
// @route   GET /api/events/:id/participants
// @access  Private (Organizer only - own events)
exports.getEventParticipants = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email contactNumber participantType');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      data: event.participants
    });
  } catch (error) {
    console.error('Get event participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer - own events, Admin - all events)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer of this event (admins can delete any event)
    if (req.userRole !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Prevent deletion if event has participants (optional - can be overridden by admin with force flag)
    if (event.participants.length > 0 && req.userRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete event with ${event.participants.length} registered participants. Please close the event instead.`
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance data for an event
// @route   GET /api/events/:id/attendance
// @access  Private (Organizer/Admin)
exports.getAttendanceData = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email')
      .populate('organizer', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access attendance data'
      });
    }

    res.status(200).json({
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate
      },
      participants: event.participants.map(p => ({
        _id: p._id,
        participant: p.participant,
        ticketId: p.ticketId,
        attendance: p.attendance || false,
        attendanceTime: p.attendanceTime,
        registrationDate: p.registrationDate
      }))
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark attendance via QR scan
// @route   POST /api/events/:id/mark-attendance
// @access  Private (Organizer/Admin)
exports.markAttendance = async (req, res) => {
  try {
    const { ticketId, method } = req.body;

    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email')
      .populate('organizer', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark attendance'
      });
    }

    // Find participant with this ticket ID
    const participantIndex = event.participants.findIndex(p => p.ticketId === ticketId);

    if (participantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found for this event'
      });
    }

    // Check if already marked
    if (event.participants[participantIndex].attendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked'
      });
    }

    // Mark attendance
    event.participants[participantIndex].attendance = true;
    event.participants[participantIndex].attendanceTime = new Date();

    await event.save();

    // Create audit log
    const log = new AttendanceLog({
      event: event._id,
      participant: event.participants[participantIndex].participant._id,
      ticketId,
      markedBy: req.user._id,
      markedByRole: req.userRole,
      method,
      timestamp: new Date()
    });
    await log.save();

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      participant: event.participants[participantIndex].participant
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Manual attendance override
// @route   POST /api/events/:id/manual-override
// @access  Private (Organizer/Admin)
exports.manualAttendanceOverride = async (req, res) => {
  try {
    const { participantId, reason, action } = req.body;

    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to override attendance'
      });
    }

    // Find participant
    const participantIndex = event.participants.findIndex(
      p => p.participant._id.toString() === participantId
    );

    if (participantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this event'
      });
    }

    // Update attendance
    if (action === 'mark') {
      event.participants[participantIndex].attendance = true;
      event.participants[participantIndex].attendanceTime = new Date();
    } else if (action === 'unmark') {
      event.participants[participantIndex].attendance = false;
      event.participants[participantIndex].attendanceTime = null;
    }

    await event.save();

    // Create audit log
    const log = new AttendanceLog({
      event: event._id,
      participant: participantId,
      ticketId: event.participants[participantIndex].ticketId,
      markedBy: req.user._id,
      markedByRole: req.userRole,
      method: 'manual_override',
      reason,
      action,
      timestamp: new Date()
    });
    await log.save();

    res.status(200).json({
      success: true,
      message: `Attendance ${action === 'mark' ? 'marked' : 'unmarked'} successfully`
    });
  } catch (error) {
    console.error('Manual override error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/events/:id/export-attendance
// @access  Private (Organizer/Admin)
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email contactNumber');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to export attendance'
      });
    }

    // Generate CSV
    const csvRows = [];
    csvRows.push(['Ticket ID', 'First Name', 'Last Name', 'Email', 'Contact', 'Registration Date', 'Attendance', 'Marked At'].join(','));

    event.participants.forEach(p => {
      const row = [
        p.ticketId,
        p.participant.firstName,
        p.participant.lastName,
        p.participant.email,
        p.participant.contactNumber || 'N/A',
        new Date(p.registrationDate).toLocaleString('en-IN'),
        p.attendance ? 'Present' : 'Absent',
        p.attendanceTime ? new Date(p.attendanceTime).toLocaleString('en-IN') : 'N/A'
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${event.name.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get pending merchandise orders for an event
// @route   GET /api/events/:id/merchandise-orders
// @access  Private (Organizer/Admin)
exports.getMerchandiseOrders = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email contactNumber')
      .populate('organizer', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view orders'
      });
    }

    // Filter merchandise participants
    const orders = event.participants.map(p => ({
      _id: p._id,
      participant: p.participant,
      ticketId: p.ticketId,
      paymentStatus: p.paymentStatus,
      paymentProof: p.paymentProof,
      paymentProofUploadedAt: p.paymentProofUploadedAt,
      merchandiseOptions: p.merchandiseOptions,
      registrationDate: p.registrationDate,
      approvedAt: p.approvedAt,
      rejectionReason: p.rejectionReason
    }));

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.paymentStatus === 'pending').length,
      approved: orders.filter(o => o.paymentStatus === 'completed').length,
      rejected: orders.filter(o => o.paymentStatus === 'rejected').length
    };

    res.status(200).json({
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        eventType: event.eventType,
        registrationFee: event.registrationFee,
        merchandiseDetails: event.merchandiseDetails
      },
      orders,
      stats
    });
  } catch (error) {
    console.error('Get merchandise orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve merchandise payment
// @route   PUT /api/events/:id/approve-payment/:participantEntryId
// @access  Private (Organizer/Admin)
exports.approvePayment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email')
      .populate('organizer', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve payments'
      });
    }

    // Find participant entry
    const participantEntry = event.participants.id(req.params.participantEntryId);

    if (!participantEntry) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (participantEntry.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${participantEntry.paymentStatus}`
      });
    }

    // Approve payment
    participantEntry.paymentStatus = 'completed';
    participantEntry.approvedBy = req.user._id;
    participantEntry.approvedAt = new Date();

    // Decrement stock on approval (as per requirement)
    if (event.merchandiseDetails && event.merchandiseDetails.stockQuantity !== undefined) {
      event.merchandiseDetails.stockQuantity -= 1;
      console.log(`📦 Stock decremented on approval. New stock: ${event.merchandiseDetails.stockQuantity}`);
    }

    // Add revenue
    event.revenue += event.registrationFee;
    await event.save();

    // Generate QR code for the participant
    const qrData = {
      ticketId: participantEntry.ticketId,
      eventId: event._id,
      participantId: participantEntry.participant._id,
      participantName: `${participantEntry.participant.firstName} ${participantEntry.participant.lastName}`,
      participantEmail: participantEntry.participant.email,
      eventName: event.name,
      eventDate: event.startDate
    };
    const qrCode = await generateQRCode(qrData);

    // Update participant's registered event status and QR code
    const participant = await Participant.findById(participantEntry.participant._id);
    if (participant) {
      const regEvent = participant.registeredEvents.find(
        re => re.event.toString() === event._id.toString()
      );
      if (regEvent) {
        regEvent.status = 'registered';
        regEvent.qrCode = qrCode;
        await participant.save();
      }
    }

    // Send approval email
    await sendMerchandiseApprovalEmail(
      participantEntry.participant.email,
      event,
      { ticketId: participantEntry.ticketId, qrCode: qrCode },
      participantEntry.merchandiseOptions || {}
    );

    res.status(200).json({
      success: true,
      message: `Payment approved for ${participantEntry.participant.firstName} ${participantEntry.participant.lastName}`
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reject merchandise payment
// @route   PUT /api/events/:id/reject-payment/:participantEntryId
// @access  Private (Organizer/Admin)
exports.rejectPayment = async (req, res) => {
  try {
    const { reason } = req.body;

    const event = await Event.findById(req.params.id)
      .populate('participants.participant', 'firstName lastName email')
      .populate('organizer', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin' && event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject payments'
      });
    }

    // Find participant entry
    const participantEntry = event.participants.id(req.params.participantEntryId);

    if (!participantEntry) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (participantEntry.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${participantEntry.paymentStatus}`
      });
    }

    // Reject payment
    participantEntry.paymentStatus = 'rejected';
    participantEntry.rejectionReason = reason || 'Payment proof could not be verified';
    
    // Note: Stock was not decremented during order placement (when payment proof was uploaded)
    // So no need to increment stock here. Stock is only decremented on approval.
    
    await event.save();

    // Update participant's registered event status
    const participant = await Participant.findById(participantEntry.participant._id);
    if (participant) {
      const regEvent = participant.registeredEvents.find(
        re => re.event.toString() === event._id.toString()
      );
      if (regEvent) {
        regEvent.status = 'rejected';
        await participant.save();
      }
    }

    // Send rejection email
    await sendMerchandiseRejectionEmail(
      participantEntry.participant.email,
      event,
      { orderId: participantEntry.ticketId },
      reason
    );

    res.status(200).json({
      success: true,
      message: `Payment rejected for ${participantEntry.participant.firstName} ${participantEntry.participant.lastName}`
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
