import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { PREDEFINED_INTERESTS } from '../constants/interests';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    college: '',
    areasOfInterest: []
  });
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/participant/profile');
      const profile = data.data;
      console.log('Profile fetched:', profile);
      console.log('Areas of Interest from server:', profile.areasOfInterest);
      setProfileData(profile);
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        contactNumber: profile.contactNumber || '',
        college: profile.college || '',
        areasOfInterest: profile.areasOfInterest || []
      });
      
      // Fetch followed clubs with details
      if (profile.followedClubs && profile.followedClubs.length > 0) {
        setFollowedClubs(profile.followedClubs);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user from context
      if (user) {
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          contactNumber: user.contactNumber || '',
          college: user.college || '',
          areasOfInterest: user.areasOfInterest || []
        });
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleInterest = (interest) => {
    console.log('Toggling interest:', interest);
    console.log('Current interests:', formData.areasOfInterest);
    
    if (formData.areasOfInterest.includes(interest)) {
      // Remove interest
      const updated = formData.areasOfInterest.filter(i => i !== interest);
      console.log('Removing interest, new array:', updated);
      setFormData({
        ...formData,
        areasOfInterest: updated
      });
    } else {
      // Add interest
      const updated = [...formData.areasOfInterest, interest];
      console.log('Adding interest, new array:', updated);
      setFormData({
        ...formData,
        areasOfInterest: updated
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('Submitting profile data:', formData);
    console.log('Areas of Interest being sent:', formData.areasOfInterest);

    try {
      const response = await api.put('/participant/profile', formData);
      console.log('Profile update response:', response.data);
      toast.success('Profile updated successfully!');
      fetchProfile(); // Refresh the profile to get latest data
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollowClub = async (clubId) => {
    try {
      await api.post(`/participant/follow/${clubId}`);
      toast.success('Unfollowed club successfully!');
      fetchProfile(); // Refresh to update followed clubs
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unfollow club');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.put('/participant/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="profile-container">
        <h1>My Profile</h1>

        <div className="profile-card card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="profile-info">
              <h2>{user?.firstName} {user?.lastName}</h2>
              <p className="email">{user?.email}</p>
              <p className="type">
                {user?.participantType === 'IIIT' ? 'IIIT Student' : 'Non-IIIT Participant'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <h3>Editable Fields</h3>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
              />
            </div>

            {user?.participantType === 'Non-IIIT' && (
              <div className="form-group">
                <label>College/Organization *</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Areas of Interest</label>
              <p className="hint-text">Select your interests from the options below</p>
              <div className="interests-grid">
                {PREDEFINED_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleToggleInterest(interest)}
                    className={`interest-pill ${formData.areasOfInterest.includes(interest) ? 'selected' : ''}`}
                  >
                    {formData.areasOfInterest.includes(interest) ? '✓ ' : ''}{interest}
                  </button>
                ))}
              </div>
              {formData.areasOfInterest.length > 0 && (
                <p className="selected-count">
                  {formData.areasOfInterest.length} interest{formData.areasOfInterest.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Followed Clubs Section */}
          <div className="profile-section">
            <h3>Followed Clubs</h3>
            <p className="hint-text">Manage your followed clubs</p>
            {followedClubs && followedClubs.length > 0 ? (
              <div className="followed-clubs-grid">
                {followedClubs.map((club) => (
                  <div key={club._id} className="followed-club-card">
                    <div className="club-info-inline">
                      <div>
                        <h4>{club.name}</h4>
                        <p className="club-category">{club.category}</p>
                      </div>
                      <button
                        onClick={() => handleUnfollowClub(club._id)}
                        className="btn btn-sm btn-danger"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-text">Not following any clubs yet. Visit the Clubs page to follow clubs.</p>
            )}
          </div>

          {/* Security Settings - Password Change */}
          <div className="profile-section">
            <h3>Security Settings</h3>
            <p className="hint-text">Change your password to keep your account secure</p>
            
            {!showPasswordSection ? (
              <button
                onClick={() => setShowPasswordSection(true)}
                className="btn btn-secondary"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                  <small>Minimum 6 characters</small>
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div className="password-actions">
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                    {passwordLoading ? 'Changing...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="profile-non-editable">
            <h3>Account Information (Read-only)</h3>
            <div className="info-grid">
              <div>
                <strong>Email Address:</strong>
                <p>{user?.email}</p>
              </div>
              <div>
                <strong>Participant Type:</strong>
                <p>{user?.participantType === 'IIIT' ? 'IIIT Student' : 'Non-IIIT Participant'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
