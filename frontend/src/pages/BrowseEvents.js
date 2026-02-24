import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import './BrowseEvents.css';

const BrowseEvents = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recommended'); // recommended, date, followed
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    eligibility: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchTrendingEvents();
  }, [sortBy]);

  const fetchTrendingEvents = async () => {
    try {
      const { data } = await api.get('/events?trending=true');
      setTrendingEvents(data.data || []);
    } catch (error) {
      console.error('Error fetching trending events:', error);
    }
  };

  const fetchEvents = async (filterParams = {}) => {
    try {
      setLoading(true);
      
      // Add sort/recommendation parameter based on user selection
      if (user?.role === 'participant') {
        if (sortBy === 'recommended') {
          filterParams.recommended = 'true';
        } else if (sortBy === 'followed') {
          filterParams.followedClubs = 'true';
        }
      }
      
      const queryParams = new URLSearchParams(filterParams).toString();
      const { data } = await api.get(`/events?${queryParams}`);
      setEvents(data.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
  };

  const handleSearch = () => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    fetchEvents(activeFilters);
  };

  const handleReset = () => {
    setFilters({
      search: '',
      eventType: '',
      eligibility: '',
      dateFrom: '',
      dateTo: ''
    });
    fetchEvents();
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="container">
      <h1>Browse Events</h1>
      
      {/* Trending Events Section */}
      {trendingEvents.length > 0 && (
        <div className="trending-section card" style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
             Trending Events <span style={{ fontSize: '14px', fontWeight: 'normal' }}>(Top 5 in last 24h)</span>
          </h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {trendingEvents.map((event, index) => (
              <Link 
                key={event._id} 
                to={`/events/${event._id}`}
                style={{ 
                  minWidth: '250px', 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>#{index + 1}</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{event.name}</h4>
                <p style={{ margin: '0', fontSize: '13px', opacity: '0.9' }}>
                   {event.viewCount || 0} views
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Sort Options for Participants */}
      {user?.role === 'participant' && (
        <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <label style={{ fontWeight: '600' }}>Sort By:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="recommended"> Recommended for You</option>
              <option value="followed"> From Followed Clubs</option>
              <option value="date"> By Date</option>
            </select>
            <small style={{ color: '#666', marginLeft: '10px' }}>
              {sortBy === 'recommended' && '(Based on your interests and followed clubs)'}
              {sortBy === 'followed' && '(Events from clubs you follow)'}
              {sortBy === 'date' && '(Chronological order)'}
            </small>
          </div>
        </div>
      )}
      
      <div className="filters-section card">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="form-group">
            <input
              type="text"
              name="search"
              placeholder="Search events..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <select name="eventType" value={filters.eventType} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="Normal">Normal Events</option>
              <option value="Merchandise">Merchandise</option>
            </select>
          </div>

          <div className="form-group">
            <select name="eligibility" value={filters.eligibility} onChange={handleFilterChange}>
              <option value="">All Eligibility</option>
              <option value="IIIT">IIIT Only</option>
              <option value="Non-IIIT">Non-IIIT Only</option>
            </select>
          </div>

          <div className="form-group">
            <input
              type="date"
              name="dateFrom"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <input
              type="date"
              name="dateTo"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-actions">
            <button onClick={handleSearch} className="btn btn-primary">
              Apply Filters
            </button>
            <button onClick={handleReset} className="btn btn-secondary">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="events-grid">
        {events.length === 0 ? (
          <p className="no-events">No events found</p>
        ) : (
          events.map((event) => {
            return (
              <div key={event._id} className="event-card">
                <div className="event-type-badge">{event.eventType}</div>
                
                <h3>{event.name}</h3>
                <p className="event-description">{event.description.substring(0, 100)}...</p>
                <div className="event-meta">
                  <p><strong>Organizer:</strong> {event.organizer?.name}</p>
                  <p><strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
                  <p><strong>Fee:</strong> ₹{event.registrationFee}</p>
                  <p><strong>Eligibility:</strong> {event.eligibility}</p>
                </div>
                <Link to={`/events/${event._id}`} className="btn btn-primary">
                  View Details
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BrowseEvents;
