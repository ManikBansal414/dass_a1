/**
 * Compute event status based on current time and event dates
 * As per clarification: Status should be determined by comparing current time with start/end times
 * Manual override is still possible, but computed status takes precedence for display
 */

const computeEventStatus = (event) => {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const regDeadline = new Date(event.registrationDeadline);
  
  // If event is in Draft status, keep it as Draft (manual control)
  if (event.status === 'Draft') {
    return 'Draft';
  }
  
  // Auto-compute status based on current time
  // Published: Before start date
  if (now < start) {
    return 'Published';
  }
  
  // Ongoing: Between start and end date
  if (now >= start && now <= end) {
    return 'Ongoing';
  }
  
  // Closed: After end date
  if (now > end) {
    return 'Closed';
  }
  
  // Fallback to stored status if something unexpected
  return event.status;
};

/**
 * Add computed status to event object
 * Preserves original status as 'manualStatus' for reference
 */
const addComputedStatus = (event) => {
  if (!event) return event;
  
  const eventObj = event.toObject ? event.toObject() : event;
  
  eventObj.manualStatus = eventObj.status; // Store original/manual status
  eventObj.status = computeEventStatus(eventObj); // Override with computed status
  
  return eventObj;
};

/**
 * Add computed status to array of events
 */
const addComputedStatusToArray = (events) => {
  if (!Array.isArray(events)) return events;
  return events.map(event => addComputedStatus(event));
};

module.exports = {
  computeEventStatus,
  addComputedStatus,
  addComputedStatusToArray
};
