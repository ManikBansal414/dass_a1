import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cultural',
    description: '',
    contactEmail: ''
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const { data } = await api.get('/admin/organizers');
      setOrganizers(data.data);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      toast.error('Failed to load organizers');
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
      fetchOrganizers();
      toast.success('Organizer created successfully!');
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
      fetchOrganizers();
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
      fetchOrganizers();
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
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to delete organizer');
    }
  };

  if (loading) {
    return <div className="loading">Loading organizers...</div>;
  }

  return (
    <div className="container">
      <h1>Manage Clubs/Organizers</h1>

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

      {/* Quick Actions */}
      <div className="dashboard-section card">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
          style={{ marginBottom: '20px' }}
        >
          {showCreateForm ? '❌ Cancel' : '➕ Add New Organizer'}
        </button>

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
      </div>

      {/* Organizers Table */}
      <div className="dashboard-section card">
        <h2>All Organizers ({organizers.length})</h2>
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
              {organizers.length > 0 ? (
                organizers.map((org) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
                    No organizers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;
