import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './MerchandiseOrders.css';

const MerchandiseOrders = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [eventId]);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/merchandise-orders`);
      setEvent(data.event);
      setOrders(data.orders);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (order) => {
    if (!window.confirm(`Approve payment for ${order.participant.firstName} ${order.participant.lastName}?`)) {
      return;
    }

    setProcessing(true);
    try {
      await api.put(`/events/${eventId}/approve-payment/${order._id}`);
      toast.success(`✅ Payment approved for ${order.participant.firstName}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    
    setProcessing(true);
    try {
      await api.put(`/events/${eventId}/reject-payment/${selectedOrder._id}`, {
        reason: rejectionReason || 'Payment proof could not be verified'
      });
      toast.success(`❌ Payment rejected for ${selectedOrder.participant.firstName}`);
      setShowRejectModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const viewProof = (order) => {
    setSelectedOrder(order);
    setShowProofModal(true);
  };

  const openRejectModal = (order) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'pending') return o.paymentStatus === 'pending';
    if (filter === 'approved') return o.paymentStatus === 'completed';
    if (filter === 'rejected') return o.paymentStatus === 'rejected';
    return true;
  });

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="merchandise-orders-page">
      <div className="orders-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          ← Back
        </button>
        <h1>📦 Merchandise Orders - {event?.name}</h1>
      </div>

      {/* Stats Cards */}
      <div className="order-stats-grid">
        <div className="order-stat-card total">
          <div className="order-stat-value">{stats.total}</div>
          <div className="order-stat-label">Total Orders</div>
        </div>
        <div className="order-stat-card pending">
          <div className="order-stat-value">{stats.pending}</div>
          <div className="order-stat-label">Pending Review</div>
        </div>
        <div className="order-stat-card approved">
          <div className="order-stat-value">{stats.approved}</div>
          <div className="order-stat-label">Approved</div>
        </div>
        <div className="order-stat-card rejected">
          <div className="order-stat-value">{stats.rejected}</div>
          <div className="order-stat-label">Rejected</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="order-filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({stats.total})
        </button>
        <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          ⏳ Pending ({stats.pending})
        </button>
        <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>
          ✅ Approved ({stats.approved})
        </button>
        <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
          ❌ Rejected ({stats.rejected})
        </button>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container card">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <p>No {filter !== 'all' ? filter : ''} orders found</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Participant</th>
                <th>Email</th>
                <th>Options</th>
                <th>Amount</th>
                <th>Proof</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id} className={`order-row ${order.paymentStatus}`}>
                  <td className="order-id-cell">{order.ticketId}</td>
                  <td className="name-cell">
                    {order.participant?.firstName} {order.participant?.lastName}
                  </td>
                  <td>{order.participant?.email}</td>
                  <td>
                    {order.merchandiseOptions?.size && <span className="option-tag">Size: {order.merchandiseOptions.size}</span>}
                    {order.merchandiseOptions?.color && <span className="option-tag">Color: {order.merchandiseOptions.color}</span>}
                    {order.merchandiseOptions?.variant && <span className="option-tag">{order.merchandiseOptions.variant}</span>}
                  </td>
                  <td className="amount-cell">₹{event?.registrationFee || 0}</td>
                  <td>
                    {order.paymentProof ? (
                      <button onClick={() => viewProof(order)} className="btn btn-sm btn-secondary">
                        🖼️ View
                      </button>
                    ) : (
                      <span className="no-proof">No proof</span>
                    )}
                  </td>
                  <td>
                    <span className={`payment-status-badge ${order.paymentStatus}`}>
                      {order.paymentStatus === 'completed' ? '✅ Approved' :
                       order.paymentStatus === 'pending' ? '⏳ Pending' :
                       order.paymentStatus === 'rejected' ? '❌ Rejected' :
                       order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    {new Date(order.registrationDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    {order.paymentStatus === 'pending' && (
                      <div className="order-actions">
                        <button
                          onClick={() => handleApprove(order)}
                          className="btn btn-sm btn-success"
                          disabled={processing}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(order)}
                          className="btn btn-sm btn-danger"
                          disabled={processing}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {order.paymentStatus === 'rejected' && order.rejectionReason && (
                      <span className="rejection-reason" title={order.rejectionReason}>
                        📝 {order.rejectionReason.substring(0, 30)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Proof Modal */}
      {showProofModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-content proof-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Payment Proof - {selectedOrder.participant?.firstName} {selectedOrder.participant?.lastName}</h3>
            <div className="proof-details">
              <p><strong>Order ID:</strong> {selectedOrder.ticketId}</p>
              <p><strong>Amount:</strong> ₹{event?.registrationFee || 0}</p>
              {selectedOrder.paymentProofUploadedAt && (
                <p><strong>Uploaded:</strong> {new Date(selectedOrder.paymentProofUploadedAt).toLocaleString('en-IN')}</p>
              )}
            </div>
            {selectedOrder.paymentProof && (
              <div className="proof-image-container">
                <img src={selectedOrder.paymentProof} alt="Payment proof" className="proof-image" />
              </div>
            )}
            <div className="modal-actions">
              {selectedOrder.paymentStatus === 'pending' && (
                <>
                  <button onClick={() => handleApprove(selectedOrder)} className="btn btn-success" disabled={processing}>
                    ✅ Approve Payment
                  </button>
                  <button onClick={() => { setShowProofModal(false); openRejectModal(selectedOrder); }} className="btn btn-danger" disabled={processing}>
                    ❌ Reject Payment
                  </button>
                </>
              )}
              <button onClick={() => setShowProofModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Payment - {selectedOrder.participant?.firstName} {selectedOrder.participant?.lastName}</h3>
            <p>Order ID: {selectedOrder.ticketId}</p>
            
            <div className="form-group">
              <label>Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Blurry screenshot, incorrect amount, duplicate submission, etc."
                rows="4"
                required
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleReject} className="btn btn-danger" disabled={processing}>
                {processing ? 'Processing...' : '❌ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchandiseOrders;
