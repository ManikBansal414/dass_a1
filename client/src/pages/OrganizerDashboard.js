import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Dashboard.css';

const OrganizerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/organizer/dashboard');
      setDashboard(data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      await api.put(`/events/${eventId}`, { status: 'Published' });
      toast.success('Event published successfully!');
      fetchDashboard();
    } catch (error) {
      toast.error('Failed to publish event');
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/events/${eventId}`);
      toast.success('Event deleted successfully!');
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const filterEvents = (events) => {
    if (!events) return [];
    if (filterStatus === 'all') return events;
    return events.filter(e => e.status.toLowerCase() === filterStatus);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const filteredEvents = filterEvents(dashboard?.events || []);

  return (
    <div className="container organizer-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>📊 Organizer Dashboard</h1>
          <p className="welcome-text">Welcome back, {dashboard?.organizerName || 'Organizer'}!</p>
        </div>
        <Link to="/organizer/create-event" className="btn btn-primary btn-lg">
          + Create New Event
        </Link>
      </div>

      {/* Analytics Cards */}
      {dashboard?.analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-number">{dashboard.analytics.totalEvents || 0}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{dashboard.analytics.completedEvents || 0}</div>
            <div className="stat-label">Completed Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-number">{dashboard.analytics.totalRegistrations || 0}</div>
            <div className="stat-label">Total Registrations</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-number">₹{dashboard.analytics.totalRevenue || 0}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-number">{dashboard.analytics.totalAttendance || 0}</div>
            <div className="stat-label">Total Attendance</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❤️</div>
            <div className="stat-number">{dashboard.analytics.followers || 0}</div>
            <div className="stat-label">Followers</div>
          </div>
        </div>
      )}

      {/* Events Carousel with Filters */}
      <div className="dashboard-section card">
        <div className="section-header">
          <h2>📋 My Events</h2>
          <Link to="/organizer/create-event" className="btn btn-primary btn-sm">
            + Create Event
          </Link>
        </div>

        {/* Status Filters */}
        <div className="event-filters">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({dashboard?.events?.length || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'draft' ? 'active' : ''}`}
            onClick={() => setFilterStatus('draft')}
          >
            Draft ({dashboard?.events?.filter(e => e.status === 'Draft').length || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'published' ? 'active' : ''}`}
            onClick={() => setFilterStatus('published')}
          >
            Published ({dashboard?.events?.filter(e => e.status === 'Published').length || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'ongoing' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ongoing')}
          >
            Ongoing ({dashboard?.events?.filter(e => e.status === 'Ongoing').length || 0})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'closed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('closed')}
          >
            Closed ({dashboard?.events?.filter(e => e.status === 'Closed').length || 0})
          </button>
        </div>

        {filteredEvents.length > 0 ? (
          <div className="events-carousel">
            {filteredEvents.map((event) => (
              <div key={event._id} className="event-card-organizer">
                <span className={`event-status ${event.status.toLowerCase()}`}>
                  {event.status}
                </span>
                <div className="event-type-badge-small">{event.eventType}</div>
                
                <h3>{event.name}</h3>
                
                <div className="event-meta-small">
                  <p>📅 {new Date(event.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</p>
                  <p>👥 {event.registrationCount || 0}
                    {event.registrationLimit && ` / ${event.registrationLimit}`} registrations
                  </p>
                  {event.eventType === 'Merchandise' && event.merchandiseDetails && (
                    <p>📦 Stock: {event.merchandiseDetails.stockQuantity || 0}</p>
                  )}
                  <p>💰 Revenue: ₹{event.revenue || 0}</p>
                  {event.registrationFee > 0 && (
                    <p>💵 Fee: ₹{event.registrationFee}</p>
                  )}
                </div>

                <div className="event-actions-org">
                  <Link to={`/organizer/events/${event._id}`} className="btn btn-primary btn-sm">
                    �� Analytics
                  </Link>
                  <Link to={`/events/${event._id}`} className="btn btn-secondary btn-sm">
                    👁️ Public View
                  </Link>
                  <Link to={`/organizer/events/${event._id}/scanner`} className="btn btn-primary btn-sm">
                    📷 QR Scanner
                  </Link>
                  {event.eventType === 'Merchandise' && (
                    <Link to={`/organizer/events/${event._id}/orders`} className="btn btn-primary btn-sm">
                      📦 Orders
                    </Link>
                  )}
                  {event.status === 'Draft' && (
                    <>
                      <Link to={`/organizer/events/${event._id}/edit`} className="btn btn-primary btn-sm">
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handlePublishEvent(event._id)}
                        className="btn btn-success btn-sm"
                      >
                        ✓ Publish
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event._id, event.name)}
                        className="btn btn-danger btn-sm"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {event.status === 'Published' && (
                    <>
                      <Link to={`/organizer/events/${event._id}/edit`} className="btn btn-primary btn-sm">
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event._id, event.name)}
                        className="btn btn-danger btn-sm"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {(event.status === 'Ongoing' || event.status === 'Closed') && (
                    <button
                      onClick={() => handleDeleteEvent(event._id, event.name)}
                      className="btn btn-danger btn-sm"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p>📭 No {filterStatus !== 'all' ? filterStatus : ''} events found</p>
            {filterStatus === 'all' && (
              <Link to="/organizer/create-event" className="btn btn-primary">
                + Create Your First Event
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
