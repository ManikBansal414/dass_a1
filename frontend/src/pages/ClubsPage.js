import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './ClubsPage.css';

const ClubsPage = () => {
  const { user } = useContext(AuthContext);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedClubs, setFollowedClubs] = useState([]);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const { data } = await api.get('/participant/clubs');
      setClubs(data.data);
      
      // Get user's followed clubs
      if (user) {
        const userData = await api.get('/auth/me');
        setFollowedClubs(userData.data.data.followedClubs || []);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (clubId) => {
    if (!user) {
      toast.info('Please login to follow clubs');
      return;
    }

    try {
      const { data } = await api.post(`/participant/follow/${clubId}`);
      toast.success(data.message);
      
      // Update followed clubs list
      if (data.isFollowing) {
        setFollowedClubs([...followedClubs, clubId]);
      } else {
        setFollowedClubs(followedClubs.filter(id => id !== clubId));
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const isFollowing = (clubId) => {
    return followedClubs.some(id => id.toString() === clubId.toString());
  };

  if (loading) {
    return <div className="loading">Loading clubs...</div>;
  }

  return (
    <div className="container clubs-page">
      <div className="page-header">
        <h1> Clubs & Organizers</h1>
        <p className="subtitle">Follow your favorite clubs to stay updated with their events</p>
      </div>

      {loading ? (
        <div className="loading">Loading clubs...</div>
      ) : (
        <div className="clubs-grid-page">
          {clubs.length === 0 ? (
            <p className="no-data">No clubs found</p>
          ) : (
            clubs.map((club) => (
              <div key={club._id} className="club-card-detail card">
                <div className="club-header">
                  <div className="club-avatar-large">
                    {club.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="club-info-header">
                    <h3>{club.name}</h3>
                    <p className="club-category-badge">{club.category}</p>
                  </div>
                  {isFollowing(club._id) && (
                    <span className="following-badge"> Following</span>
                  )}
                </div>

                <p className="club-description">{club.description}</p>

                <div className="club-stats-row">
                  <div className="stat-item">
                    <span className="stat-icon"></span>
                    <div>
                      <strong>{club.followers?.length || 0}</strong>
                      <span>Followers</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon"></span>
                    <div>
                      <strong>{club.events?.length || 0}</strong>
                      <span>Events</span>
                    </div>
                  </div>
                </div>

                <div className="club-contact">
                  <p> {club.contactEmail}</p>
                  {club.contactNumber && <p> {club.contactNumber}</p>}
                </div>

                <div className="club-actions">
                  <Link to={`/clubs/${club._id}`} className="btn btn-secondary">
                    View Details
                  </Link>
                  <button
                    onClick={() => handleFollowToggle(club._id)}
                    className={`btn ${isFollowing(club._id) ? 'btn-outline' : 'btn-primary'}`}
                  >
                    {isFollowing(club._id) ? ' Following' : '+ Follow'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClubsPage;
