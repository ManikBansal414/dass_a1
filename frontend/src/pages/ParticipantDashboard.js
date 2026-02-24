import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Dashboard.css';

const ParticipantDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, normal, merchandise, completed, cancelled
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [recommendedEvents, setRecommendedEvents] = useState([]);

  useEffect(() => {
    fetchDashboard();
    fetchRecommendedEvents();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/participant/dashboard');
      console.log('Dashboard data received:', data.data);
      console.log('Areas of Interest:', data.data.areasOfInterest);
      console.log('Available Events:', data.data.availableEvents);
      setDashboard(data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedEvents = async () => {
    try {
      const { data } = await api.get('/events?recommended=true&limit=6');
      setRecommendedEvents(data.data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const filterEvents = (events) => {
    if (!events) return [];
    
    switch (activeTab) {
      case 'normal':
        return events.filter(e => e.event?.eventType === 'Normal');
      case 'merchandise':
        return events.filter(e => e.event?.eventType === 'Merchandise');
      case 'completed':
        return events.filter(e => e.status === 'attended' || e.attendance === true);
      case 'cancelled':
        return events.filter(e => e.status === 'cancelled');
      default:
        return events;
    }
  };

  const handleViewTicket = (registration) => {
    if (!registration.qrCode) {
      toast.error('Ticket not available');
      return;
    }
    setSelectedTicket(registration);
    setShowTicketModal(true);
  };

  const downloadTicket = () => {
    if (!selectedTicket?.qrCode) return;
    
    const link = document.createElement('a');
    link.href = selectedTicket.qrCode;
    link.download = `ticket-${selectedTicket.ticketId}.png`;
    link.click();
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const allRegisteredEvents = [
    ...(dashboard?.upcomingEvents || []),
    ...(dashboard?.pastEvents || [])
  ];

  const filteredEvents = filterEvents(allRegisteredEvents);

  return (
    <div className="container dashboard-container">
      <div className="dashboard-header">
        <h1>My Events Dashboard</h1>
        <p className="welcome-text">
          Welcome back, {dashboard?.firstName || 'Participant'}!
        </p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{dashboard?.upcomingEvents?.length || 0}</div>
          <div className="stat-label">Registered Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard?.availableEvents?.length || 0}</div>
          <div className="stat-label">Available Events</div>
          <p style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
            (Events you can register for)
          </p>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard?.followedClubs?.length || 0}</div>
          <div className="stat-label">Followed Clubs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard?.areasOfInterest?.length || 0}</div>
          <div className="stat-label">Interests</div>
          <p style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
            Raw: {dashboard?.areasOfInterest?.length}
          </p>
        </div>
      </div>

      {/* Upcoming Events Section - Available to Register */}
      <div className="dashboard-section card">
        <div className="section-header">
          <h2> Upcoming Events</h2>
          <Link to="/events" className="btn btn-primary btn-sm">Browse All Events</Link>
        </div>
        {dashboard?.availableEvents && dashboard.availableEvents.length > 0 ? (
          <div className="events-grid">
            {dashboard.availableEvents.map((event) => (
              <div key={event._id} className="event-card upcoming">
                <div className="event-type-badge">{event.eventType}</div>
                <h3>{event.name}</h3>
                <p className="event-description">{event.description?.substring(0, 100)}...</p>
                <div className="event-info">
                  <p><strong> Organizer:</strong> {event.organizer?.name}</p>
                  <p><strong> Date:</strong> {new Date(event.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  <p><strong> Fee:</strong> {event.registrationFee === 0 ? 'Free' : `₹${event.registrationFee}`}</p>
                  <p><strong> Eligibility:</strong> {event.eligibility}</p>
                </div>
                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags-mini">
                    {event.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="tag-mini">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="event-actions">
                  <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm">
                    View & Register
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p> No upcoming events available</p>
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        )}
      </div>

      {/* My Registered Events */}
      {dashboard?.upcomingEvents && dashboard.upcomingEvents.length > 0 && (
        <div className="dashboard-section card">
          <div className="section-header">
            <h2> My Registered Events</h2>
          </div>
          <div className="events-grid">
            {dashboard.upcomingEvents.map((registration) => (
              <div key={registration._id} className="event-card upcoming">
                <div className="event-type-badge">{registration.event?.eventType}</div>
                {registration.paymentStatus === 'pending' && (
                  <div className="pending-badge"> Payment Pending</div>
                )}
                {registration.paymentStatus === 'rejected' && (
                  <div className="rejected-badge"> Payment Rejected</div>
                )}
                <h3>{registration.event?.name}</h3>
                <div className="event-info">
                  <p><strong> Organizer:</strong> {registration.event?.organizer?.name}</p>
                  <p><strong> Date:</strong> {new Date(registration.event?.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  {registration.team && <p><strong> Team:</strong> {registration.team}</p>}
                  <p><strong> Ticket ID:</strong> <span className="ticket-id">{registration.ticketId}</span></p>
                  {registration.paymentStatus && (
                    <p><strong> Payment:</strong> <span className={`status-badge ${registration.paymentStatus}`}>
                      {registration.paymentStatus}
                    </span></p>
                  )}
                  <p><strong>Status:</strong> <span className={`status-badge ${registration.status}`}>
                    {registration.status || 'registered'}
                  </span></p>
                </div>
                {registration.qrCode ? (
                  <div className="qr-code-small">
                    <img src={registration.qrCode} alt="QR Code" />
                  </div>
                ) : registration.paymentStatus === 'pending' ? (
                  <div className="qr-pending-notice">
                    <p> QR code will be available after payment approval</p>
                  </div>
                ) : null}
                <div className="event-actions">
                  <Link to={`/events/${registration.event?._id}`} className="btn btn-secondary btn-sm">
                    View Event
                  </Link>
                  {registration.qrCode ? (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleViewTicket(registration)}
                    >
                      View Ticket
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" disabled>
                      Ticket Pending
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended For You */}
      {recommendedEvents.length > 0 && (
        <div className="dashboard-section card">
          <div className="section-header">
            <h2> Recommended For You</h2>
            <Link to="/events" className="btn btn-secondary btn-sm">See All</Link>
          </div>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
            Based on your interests and followed clubs
          </p>
          <div className="events-grid">
            {recommendedEvents.map((event) => (
              <div key={event._id} className="event-card recommended">
                <div className="event-type-badge">{event.eventType}</div>
                <h3>{event.name}</h3>
                <p className="event-description">{event.description?.substring(0, 100)}...</p>
                <div className="event-info">
                  <p><strong> Organizer:</strong> {event.organizer?.name}</p>
                  <p><strong> Date:</strong> {new Date(event.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</p>
                  <p><strong> Fee:</strong> {event.registrationFee === 0 ? 'Free' : `₹${event.registrationFee}`}</p>
                  <p><strong> Eligibility:</strong> {event.eligibility}</p>
                </div>
                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags-mini">
                    {event.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="tag-mini">{tag}</span>
                    ))}
                  </div>
                )}
                <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participation History with Tabs */}
      <div className="dashboard-section card">
        <h2> Participation History</h2>
        
        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({allRegisteredEvents.length})
          </button>
          <button 
            className={`tab ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => setActiveTab('normal')}
          >
            Normal ({allRegisteredEvents.filter(e => e.event?.eventType === 'Normal').length})
          </button>
          <button 
            className={`tab ${activeTab === 'merchandise' ? 'active' : ''}`}
            onClick={() => setActiveTab('merchandise')}
          >
            Merchandise ({allRegisteredEvents.filter(e => e.event?.eventType === 'Merchandise').length})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({allRegisteredEvents.filter(e => e.status === 'attended' || e.attendance).length})
          </button>
          <button 
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled ({allRegisteredEvents.filter(e => e.status === 'cancelled').length})
          </button>
        </div>

        {/* Event Records */}
        {filteredEvents.length > 0 ? (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Organizer</th>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Ticket ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((registration) => (
                  <tr key={registration._id}>
                    <td>
                      <Link to={`/events/${registration.event?._id}`} className="event-name-link">
                        {registration.event?.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`type-badge ${registration.event?.eventType?.toLowerCase()}`}>
                        {registration.event?.eventType}
                      </span>
                    </td>
                    <td>{registration.event?.organizer?.name}</td>
                    <td>{new Date(registration.event?.startDate).toLocaleDateString('en-IN')}</td>
                    <td>{registration.team || '-'}</td>
                    <td>
                      {registration.paymentStatus ? (
                        <span className={`status-badge ${registration.paymentStatus}`}>
                          {registration.paymentStatus}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${registration.status}`}>
                        {registration.status || 'registered'}
                      </span>
                    </td>
                    <td>
                      <span className="ticket-id-link" title="Click to view ticket">
                        {registration.ticketId}
                      </span>
                    </td>
                    <td>
                      <Link to={`/events/${registration.event?._id}`} className="btn btn-sm btn-secondary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">
            <p>No events found in this category</p>
          </div>
        )}
      </div>

      {/* Followed Clubs & Interests */}
      <div className="dashboard-grid-2">
        <div className="dashboard-section card">
          <div className="section-header">
            <h2> Followed Clubs</h2>
            <Link to="/clubs" className="btn btn-secondary btn-sm">Browse Clubs</Link>
          </div>
          {dashboard?.followedClubs && dashboard.followedClubs.length > 0 ? (
            <div className="clubs-grid">
              {dashboard.followedClubs.map((club) => (
                <div key={club._id} className="club-card">
                  <div className="club-avatar">
                    {club.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="club-info">
                    <h4>{club.name}</h4>
                    <p className="club-category">{club.category}</p>
                    <p className="club-desc">{club.description?.substring(0, 80)}...</p>
                    <Link to={`/clubs/${club._id}`} className="btn btn-sm btn-secondary">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>Not following any clubs yet</p>
              <Link to="/clubs" className="btn btn-primary btn-sm">Browse Clubs</Link>
            </div>
          )}
        </div>

        <div className="dashboard-section card">
          <div className="section-header">
            <h2> Your Interests</h2>
            <Link to="/participant/profile" className="btn btn-secondary btn-sm">Edit</Link>
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
            Debug: {JSON.stringify(dashboard?.areasOfInterest)}
          </p>
          {dashboard?.areasOfInterest && dashboard.areasOfInterest.length > 0 ? (
            <div className="interests-tags">
              {dashboard.areasOfInterest.map((interest, index) => (
                <span key={index} className="interest-tag">{interest}</span>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No interests selected yet</p>
              <Link to="/participant/profile" className="btn btn-primary btn-sm">Add Interests</Link>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicketModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTicketModal(false)}></button>
            
            <div className="ticket-container">
              <h2> Event Ticket</h2>
              
              <div className="ticket-details">
                <h3>{selectedTicket.event?.name}</h3>
                <p><strong>Organizer:</strong> {selectedTicket.event?.organizer?.name}</p>
                <p><strong>Date:</strong> {new Date(selectedTicket.event?.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                {selectedTicket.team && <p><strong>Team:</strong> {selectedTicket.team}</p>}
                <p><strong>Ticket ID:</strong> <span className="ticket-id-display">{selectedTicket.ticketId}</span></p>
                <p><strong>Status:</strong> <span className={`status-badge ${selectedTicket.status}`}>
                  {selectedTicket.status || 'registered'}
                </span></p>
              </div>

              <div className="qr-code-display">
                <img src={selectedTicket.qrCode} alt="Ticket QR Code" />
                <p className="qr-instruction"> Show this QR code at the event entrance</p>
              </div>

              <div className="ticket-actions">
                <button onClick={downloadTicket} className="btn btn-primary">
                   Download Ticket
                </button>
                <button onClick={() => setShowTicketModal(false)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantDashboard;
