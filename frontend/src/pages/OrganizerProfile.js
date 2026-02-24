import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './OrganizerProfile.css';

const OrganizerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: ''
  });
  const [resetReason, setResetReason] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [submittingReset, setSubmittingReset] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchResetRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data.data);
      setFormData({
        name: data.data.name || '',
        category: data.data.category || '',
        description: data.data.description || '',
        contactEmail: data.data.contactEmail || '',
        contactNumber: data.data.contactNumber || '',
        discordWebhook: data.data.discordWebhook || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const { data } = await api.get('/organizer/my-reset-requests');
      setResetRequests(data.data);
    } catch (error) {
      console.error('Error fetching reset requests:', error);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    if (resetReason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setSubmittingReset(true);
    try {
      await api.post('/organizer/request-password-reset', { reason: resetReason });
      toast.success('Password reset request submitted! An admin will review it.');
      setResetReason('');
      fetchResetRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/organizer/profile', formData);
      toast.success('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="container organizer-profile-page">
      <h1> Organizer Profile</h1>

      {/* Profile Information */}
      <div className="profile-section card">
        <div className="section-header">
          <h2>Profile Information</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn btn-primary">
               Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="Club">Club</option>
                <option value="Council">Council</option>
                <option value="Fest Team">Fest Team</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Login Email (Non-editable)</label>
              <input type="email" value={profile?.email} disabled className="disabled-input" />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display">
            <div className="info-item">
              <strong>Organization Name:</strong>
              <span>{profile?.name}</span>
            </div>
            <div className="info-item">
              <strong>Category:</strong>
              <span className="category-badge">{profile?.category}</span>
            </div>
            <div className="info-item">
              <strong>Description:</strong>
              <span>{profile?.description}</span>
            </div>
            <div className="info-item">
              <strong>Contact Email:</strong>
              <span>{profile?.contactEmail}</span>
            </div>
            <div className="info-item">
              <strong>Contact Number:</strong>
              <span>{profile?.contactNumber || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <strong>Login Email:</strong>
              <span>{profile?.email}</span>
            </div>
            <div className="info-item">
              <strong>Followers:</strong>
              <span>{profile?.followers?.length || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Discord Webhook */}
      <div className="profile-section card">
        <h2> Discord Integration</h2>
        <p className="section-description">
          Auto-post new events to your Discord server using a webhook
        </p>

        <div className="form-group">
          <label>Discord Webhook URL</label>
          <input
            type="url"
            name="discordWebhook"
            value={formData.discordWebhook}
            onChange={handleChange}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <small className="form-hint">
            Get your webhook URL from Discord: Server Settings  Integrations  Webhooks
          </small>
        </div>

        <button onClick={handleSubmit} className="btn btn-primary">
          Save Webhook
        </button>
      </div>

      {/* Password Reset Request */}
      <div className="profile-section card">
        <h2> Password Reset Request</h2>
        <p className="section-description">
          Need to change your password? Submit a reset request to the admin.
          A new temporary password will be generated upon approval.
        </p>

        {resetRequests.some(r => r.status === 'pending') ? (
          <div className="reset-pending-notice">
            <p> You already have a pending password reset request. Please wait for admin review.</p>
          </div>
        ) : (
          <form onSubmit={handleRequestPasswordReset}>
            <div className="form-group">
              <label>Reason for Password Reset *</label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="E.g., Forgot password, account compromised, need to change credentials for security..."
                rows="3"
                required
                minLength="10"
              />
              <small className="form-hint">Minimum 10 characters. Be specific about why you need a reset.</small>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submittingReset}>
              {submittingReset ? 'Submitting...' : ' Submit Reset Request'}
            </button>
          </form>
        )}

        {/* Reset Request History */}
        {resetRequests.length > 0 && (
          <div className="reset-history">
            <h3> Reset Request History</h3>
            <table className="reset-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Comments</th>
                </tr>
              </thead>
              <tbody>
                {resetRequests.map((request) => (
                  <tr key={request._id}>
                    <td>{new Date(request.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}</td>
                    <td style={{ maxWidth: '200px' }}>{request.reason}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status === 'pending' ? ' Pending' :
                         request.status === 'approved' ? ' Approved' :
                         ' Rejected'}
                      </span>
                    </td>
                    <td>{request.adminComments || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerProfile;
