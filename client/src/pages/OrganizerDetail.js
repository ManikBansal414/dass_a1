import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './OrganizerDetail.css';

const OrganizerDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in StrictMode
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchOrganizerDetails();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrganizerDetails = async () => {
    try {
      // Fetch organizer details and events from participant API
      const { data } = await api.get(`/participant/clubs/${id}`);
      
      setOrganizer(data.data.organizer);
      setEvents({
        upcoming: data.data.upcomingEvents || [],
        past: data.data.pastEvents || []
      });

      // Check if following (only for logged-in participants)
      if (user && user.role === 'participant') {
        try {
          const { data: userData } = await api.get('/auth/me');
          setIsFollowing(userData.data.data.followedClubs?.some(
            club => club._id?.toString() === id || club.toString() === id
          ));
        } catch (err) {
          // Silently fail - user might not be logged in
          console.log('Could not fetch user data');
        }
      }
    } catch (error) {
      console.error('Error fetching organizer details:', error);
      toast.error('Failed to load organizer details');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      toast.info('Please login to follow clubs');
      return;
    }

    try {
      const { data } = await api.post(`/participant/follow/${id}`);
      toast.success(data.message);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return <div className="loading">Loading organizer details...</div>;
  }

  if (!organizer) {
    return <div className="container"><p>Organizer not found</p></div>;
  }

  const displayEvents = activeTab === 'upcoming' ? events.upcoming : events.past;

  return (
    <div className="container organizer-detail-page">
      {/* Header */}
      <div className="organizer-header card">
        <div className="organizer-banner">
          <div className="organizer-avatar-xl">
            {organizer.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        </div>
        
        <div className="organizer-info">
          <div className="organizer-title">
            <div>
              <h1>{organizer.name}</h1>
              <p className="organizer-category">{organizer.category}</p>
            </div>
            {user && user.role === 'participant' && (
              <button
                onClick={handleFollowToggle}
                className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'} btn-lg`}
              >
                {isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>
          
          <p className="organizer-description">{organizer.description}</p>
          
          <div className="organizer-contact-info">
            <div className="contact-item">
              <span className="icon">📧</span>
              <span>{organizer.contactEmail}</span>
            </div>
            {organizer.contactNumber && (
              <div className="contact-item">
                <span className="icon">📞</span>
                <span>{organizer.contactNumber}</span>
              </div>
            )}
          </div>

          <div className="organizer-stats">
            <div className="stat-box">
              <strong>{organizer.followers?.length || 0}</strong>
              <span>Followers</span>
            </div>
            <div className="stat-box">
              <strong>{events.upcoming.length}</strong>
              <span>Upcoming Events</span>
            </div>
            <div className="stat-box">
              <strong>{events.past.length}</strong>
              <span>Past Events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="organizer-events card">
        <div className="section-header">
          <h2>📅 Events</h2>
        </div>

        {/* Tabs */}
        <div className="event-tabs">
          <button
            className={`event-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({events.upcoming.length})
          </button>
          <button
            className={`event-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past ({events.past.length})
          </button>
        </div>

        {/* Events List */}
        {displayEvents.length > 0 ? (
          <div className="events-grid-detail">
            {displayEvents.map((event) => (
              <div key={event._id} className="event-card-org">
                <div className="event-type-badge">{event.eventType}</div>
                <h3>{event.name}</h3>
                <p className="event-desc">{event.description?.substring(0, 120)}...</p>
                
                <div className="event-meta">
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span>{new Date(event.startDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">👥</span>
                    <span>{event.registrationCount || 0} registered</span>
                  </div>
                  {event.registrationFee > 0 && (
                    <div className="meta-item">
                      <span className="meta-icon">💰</span>
                      <span>₹{event.registrationFee}</span>
                    </div>
                  )}
                </div>

                <div className="event-tags">
                  {event.tags?.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="event-tag">{tag}</span>
                  ))}
                </div>

                <Link to={`/events/${event._id}`} className="btn btn-secondary btn-block">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p>No {activeTab} events found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetail;
