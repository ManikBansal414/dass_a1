import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);
  const [resetStats, setResetStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [showResetCredentials, setShowResetCredentials] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cultural',
    description: '',
    contactEmail: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashData, orgData, eventsData, resetData] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/organizers'),
        api.get('/admin/events'),
        api.get('/admin/password-reset-requests')
      ]);
      setDashboard(dashData.data.data);
      setOrganizers(orgData.data.data);
      setEvents(eventsData.data.data);
      setResetRequests(resetData.data.data);
      setResetStats(resetData.data.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/admin/organizers', formData);
      setCredentials({
        name: formData.name,
        email: data.data.email,
        password: data.data.temporaryPassword
      });
      setShowCredentials(true);
      setShowCreateForm(false);
      setFormData({
        name: '',
        category: 'Cultural',
        description: '',
        contactEmail: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organizer');
    }
  };

  const handleRemoveOrganizer = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this organizer?')) {
      return;
    }

    try {
      await api.delete(`/admin/organizers/${id}`);
      toast.success('Organizer deactivated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate organizer');
    }
  };

  const handleReactivateOrganizer = async (id) => {
    if (!window.confirm('Are you sure you want to reactivate this organizer?')) {
      return;
    }

    try {
      await api.put(`/admin/organizers/${id}/reactivate`);
      toast.success('Organizer reactivated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to reactivate organizer');
    }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!window.confirm(`⚠️ WARNING: This will PERMANENTLY DELETE "${name}" and cannot be undone!\n\nAre you absolutely sure?`)) {
      return;
    }

    try {
      await api.delete(`/admin/organizers/${id}?permanent=true`);
      toast.success('Organizer permanently deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete organizer');
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      await api.put(`/events/${eventId}`, { status: 'Published' });
      toast.success('Event published successfully!');
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleApproveResetRequest = async (id) => {
    if (!window.confirm('Approve this password reset request? A new temporary password will be generated.')) {
      return;
    }

    try {
      const { data } = await api.put(`/admin/password-reset-requests/${id}/approve`);
      setResetCredentials({
        name: data.data.organizerName,
        email: data.data.organizerEmail,
        password: data.data.temporaryPassword
      });
      setShowResetCredentials(true);
      toast.success('Password reset approved!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectResetRequest = async (id) => {
    const comments = window.prompt('Enter reason for rejection:');
    if (comments === null) return; // User cancelled

    try {
      await api.put(`/admin/password-reset-requests/${id}/reject`, { comments });
      toast.success('Password reset request rejected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      {/* Credentials Modal */}
      {showCredentials && credentials && (
        <div className="modal-overlay" onClick={() => setShowCredentials(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Organizer Created Successfully!</h2>
            <div className="credentials-box">
              <p><strong>Name:</strong> {credentials.name}</p>
              <p><strong>Login Email:</strong> {credentials.email}</p>
              <p><strong>Temporary Password:</strong> <span className="password">{credentials.password}</span></p>
            </div>
            <p className="warning-text">⚠️ Share these credentials with the organizer. They should change the password after first login.</p>
            <button onClick={() => setShowCredentials(false)} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset Credentials Modal */}
      {showResetCredentials && resetCredentials && (
        <div className="modal-overlay" onClick={() => setShowResetCredentials(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🔑 Password Reset Approved!</h2>
            <div className="credentials-box">
              <p><strong>Name:</strong> {resetCredentials.name}</p>
              <p><strong>Email:</strong> {resetCredentials.email}</p>
              <p><strong>New Temporary Password:</strong> <span className="password">{resetCredentials.password}</span></p>
            </div>
            <p className="warning-text">⚠️ Share this new password with the organizer. They should change it after logging in.</p>
            <button onClick={() => setShowResetCredentials(false)} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {dashboard && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{dashboard.totalOrganizers}</h3>
            <p>Total Organizers</p>
          </div>
          <div className="stat-card">
            <h3>{dashboard.activeOrganizers}</h3>
            <p>Active Organizers</p>
          </div>
          <div className="stat-card">
            <h3>{dashboard.totalEvents}</h3>
            <p>Total Events</p>
          </div>
          <div className="stat-card">
            <h3>{dashboard.totalParticipants}</h3>
            <p>Total Participants</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? '❌ Cancel' : '➕ Add New Organizer'}
          </button>
        </div>
      </div>

      {/* Organizer Management */}
      <div className="dashboard-section card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Manage Clubs/Organizers</h2>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateOrganizer} className="create-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="Cultural">Cultural</option>
                  <option value="Technical">Technical</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Contact Email *</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
              <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
                Login email will be auto-generated from organizer name
              </small>
            </div>

            <button type="submit" className="btn btn-success">
              Create Organizer
            </button>
          </form>
        )}

        <div className="organizers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Email</th>
                <th>Status</th>
                <th>Followers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => (
                <tr key={org._id}>
                  <td>{org.name}</td>
                  <td>{org.category}</td>
                  <td>{org.email}</td>
                  <td>
                    <span className={`status-badge ${org.isActive ? 'active' : 'inactive'}`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{org.followers?.length || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {org.isActive ? (
                        <button
                          onClick={() => handleRemoveOrganizer(org._id)}
                          className="btn btn-warning btn-sm"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateOrganizer(org._id)}
                          className="btn btn-success btn-sm"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => handlePermanentDelete(org._id, org.name)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Requests */}
      <div className="dashboard-section card">
        <h2>🔑 Password Reset Requests {resetStats.pending > 0 && <span className="pending-badge">{resetStats.pending} pending</span>}</h2>
        
        {resetRequests.length > 0 ? (
          <div className="organizers-table">
            <table>
              <thead>
                <tr>
                  <th>Organizer</th>
                  <th>Email</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resetRequests.map((request) => (
                  <tr key={request._id}>
                    <td>{request.organizer?.name || 'Unknown'}</td>
                    <td>{request.organizer?.email || 'N/A'}</td>
                    <td style={{ maxWidth: '250px' }}>{request.reason}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status === 'pending' ? '⏳ Pending' :
                         request.status === 'approved' ? '✅ Approved' :
                         '❌ Rejected'}
                      </span>
                    </td>
                    <td>{new Date(request.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApproveResetRequest(request._id)}
                            className="btn btn-success btn-sm"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectResetRequest(request._id)}
                            className="btn btn-danger btn-sm"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                      {request.status !== 'pending' && request.adminComments && (
                        <span style={{ fontSize: '13px', color: '#7f8c8d' }}>{request.adminComments}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ padding: '20px', color: '#7f8c8d', textAlign: 'center' }}>No password reset requests</p>
        )}
      </div>

      {/* Event Management */}
      <div className="dashboard-section card">
        <h2>Manage Events</h2>
        <div className="organizers-table">
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Organizer</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registrations</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id}>
                  <td>{event.name}</td>
                  <td>{event.organizer?.name || 'Unknown'}</td>
                  <td>{event.eventType}</td>
                  <td>
                    <span className={`status-badge ${event.status.toLowerCase()}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>{event.registrationCount || 0}</td>
                  <td>{new Date(event.startDate).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {event.status === 'Draft' && (
                        <button
                          onClick={() => handlePublishEvent(event._id)}
                          className="btn btn-success btn-sm"
                        >
                          ✓ Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event._id, event.name)}
                        className="btn btn-danger btn-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
