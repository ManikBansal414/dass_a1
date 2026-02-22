import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const PasswordResetRequests = () => {
  const [resetRequests, setResetRequests] = useState([]);
  const [resetStats, setResetStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [showResetCredentials, setShowResetCredentials] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(null);

  useEffect(() => {
    fetchResetRequests();
  }, []);

  const fetchResetRequests = async () => {
    try {
      const { data } = await api.get('/admin/password-reset-requests');
      setResetRequests(data.data);
      setResetStats(data.stats);
    } catch (error) {
      console.error('Error fetching reset requests:', error);
      toast.error('Failed to load password reset requests');
    } finally {
      setLoading(false);
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
      fetchResetRequests();
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
      fetchResetRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  if (loading) {
    return <div className="loading">Loading password reset requests...</div>;
  }

  return (
    <div className="container">
      <h1>🔑 Password Reset Requests</h1>

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
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{resetStats.total}</h3>
          <p>Total Requests</p>
        </div>
        <div className="stat-card">
          <h3>{resetStats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card">
          <h3>{resetStats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card">
          <h3>{resetStats.rejected}</h3>
          <p>Rejected</p>
        </div>
      </div>

      {/* Password Reset Requests Table */}
      <div className="dashboard-section card">
        <h2>
          All Requests 
          {resetStats.pending > 0 && <span className="pending-badge">{resetStats.pending} pending</span>}
        </h2>
        
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
                    <td>{new Date(request.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      {request.status === 'pending' ? (
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
                      ) : (
                        <span style={{ fontSize: '13px', color: '#7f8c8d' }}>
                          {request.adminComments || `${request.status === 'approved' ? 'Approved' : 'Rejected'} by admin`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ padding: '20px', color: '#7f8c8d', textAlign: 'center' }}>
            No password reset requests yet
          </p>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;
