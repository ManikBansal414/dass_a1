import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import DiscussionForum from '../components/DiscussionForum';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [customFormData, setCustomFormData] = useState({});
  const [merchandiseOptions, setMerchandiseOptions] = useState({ size: '', color: '', variant: '' });
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Event not found');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      toast.info('Please login to register for events');
      navigate('/login');
      return;
    }

    if (user.role !== 'participant') {
      toast.error('Only participants can register for events');
      return;
    }

    setRegistering(true);
    try {
      const registrationData = {
        customFormData,
        ...merchandiseOptions
      };

      // Include payment proof as base64 if uploaded
      if (paymentProof) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(paymentProof);
          });
          registrationData.paymentProof = base64;
        } catch (fileError) {
          console.error('File reading error:', fileError);
          toast.error('Failed to read payment proof file. Please try again.');
          setRegistering(false);
          return;
        }
      }

      const { data } = await api.post(`/events/${id}/register`, registrationData);
      
      if (data.data.paymentStatus === 'pending') {
        toast.success('Order submitted! Payment proof is under review.');
      } else {
        toast.success('Registration successful! Check your email for ticket details.');
      }
      
      // Reset form and reload event data
      setMerchandiseOptions({ size: '', color: '', variant: '' });
      setPaymentProof(null);
      setPaymentProofPreview(null);
      setCustomFormData({});
      await fetchEvent();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCustomFormChange = (fieldName, value) => {
    setCustomFormData({ ...customFormData, [fieldName]: value });
  };

  const handlePaymentProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setPaymentProof(file);
      setPaymentProofPreview(URL.createObjectURL(file));
    }
  };

  const downloadICS = () => {
    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Felicity//Event Management//EN
BEGIN:VEVENT
UID:${event._id}@felicity.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${event.name}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
ORGANIZER:CN=${event.organizer?.name}
LOCATION:IIIT Hyderabad
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Event Tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${event.name.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar event downloaded!');
  };

  const addToGoogleCalendar = () => {
    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${formatDate(event.startDate)}/${formatDate(event.endDate)}&details=${encodeURIComponent(event.description)}&location=IIIT+Hyderabad`;
    window.open(url, '_blank');
  };

  const addToOutlook = () => {
    const formatDate = (date) => {
      return new Date(date).toISOString();
    };

    const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.name)}&startdt=${formatDate(event.startDate)}&enddt=${formatDate(event.endDate)}&body=${encodeURIComponent(event.description)}&location=IIIT+Hyderabad`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (!event) {
    return <div className="container">Event not found</div>;
  }

  const isRegistrationOpen = 
    event.status === 'Published' && 
    new Date() < new Date(event.registrationDeadline) &&
    (!event.registrationLimit || event.registrationCount < event.registrationLimit);

  const isAlreadyRegistered = user && event.participants?.some(
    p => p.participant === (user.id || user._id)
  );

  return (
    <div className="container">
      <div className="event-details">
        <div className="event-header">
          <div className="event-type-badge">{event.eventType}</div>
          <h1>{event.name}</h1>
          <p className="organizer-name">
            by {event.organizer?.name} ({event.organizer?.category})
          </p>
        </div>

        <div className="event-info-grid">
          <div className="event-main-content card">
            <h2>About This Event</h2>
            <p>{event.description}</p>

            <div className="event-details-grid">
              <div className="detail-item">
                <strong>Start Date:</strong>
                <p>{new Date(event.startDate).toLocaleString()}</p>
              </div>
              <div className="detail-item">
                <strong>End Date:</strong>
                <p>{new Date(event.endDate).toLocaleString()}</p>
              </div>
              <div className="detail-item">
                <strong>Registration Deadline:</strong>
                <p>{new Date(event.registrationDeadline).toLocaleString()}</p>
              </div>
              <div className="detail-item">
                <strong>{event.eventType === 'Merchandise' ? 'Price:' : 'Registration Fee:'}</strong>
                <p>₹{event.registrationFee}</p>
              </div>
              <div className="detail-item">
                <strong>Eligibility:</strong>
                <p>{event.eligibility}</p>
              </div>
              <div className="detail-item">
                <strong>Registrations:</strong>
                <p>
                  {event.registrationCount}
                  {event.registrationLimit && ` / ${event.registrationLimit}`}
                </p>
              </div>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="event-tags">
                <strong>Tags:</strong>
                {event.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="organizer-contact card">
              <h3>Organizer Contact</h3>
              <p><strong>Email:</strong> {event.organizer?.contactEmail}</p>
              <p><strong>Category:</strong> {event.organizer?.category}</p>
              {event.organizer?.description && (
                <p>{event.organizer.description}</p>
              )}
            </div>
          </div>

          <div className="event-sidebar">
            <div className="registration-card card">
              <h3>Registration</h3>
              
              {isAlreadyRegistered ? (
                <div className="registered-message">
                  <p>✓ You are already registered for this event</p>
                  {event.participants?.find(p => p.participant === user?.id)?.paymentStatus === 'pending' && (
                    <p className="payment-pending-msg">⏳ Payment proof under review</p>
                  )}
                  {event.participants?.find(p => p.participant === user?.id)?.paymentStatus === 'rejected' && (
                    <p className="payment-rejected-msg">❌ Payment was rejected</p>
                  )}
                  <button
                    onClick={() => navigate('/participant/dashboard')}
                    className="btn btn-primary"
                  >
                    View My Ticket
                  </button>
                </div>
              ) : isRegistrationOpen ? (
                <>
                  {/* Merchandise Options */}
                  {event.eventType === 'Merchandise' && event.merchandiseDetails && (
                    <div className="merchandise-options">
                      <h4>🛍️ Merchandise Options</h4>
                      
                      {event.merchandiseDetails.size && event.merchandiseDetails.size.length > 0 && (
                        <div className="form-group">
                          <label>Size <span className="required">*</span></label>
                          <select
                            value={merchandiseOptions.size}
                            onChange={(e) => setMerchandiseOptions({...merchandiseOptions, size: e.target.value})}
                            required
                          >
                            <option value="">Select Size</option>
                            {event.merchandiseDetails.size.map((s, i) => (
                              <option key={i} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {event.merchandiseDetails.color && event.merchandiseDetails.color.length > 0 && (
                        <div className="form-group">
                          <label>Color <span className="required">*</span></label>
                          <select
                            value={merchandiseOptions.color}
                            onChange={(e) => setMerchandiseOptions({...merchandiseOptions, color: e.target.value})}
                            required
                          >
                            <option value="">Select Color</option>
                            {event.merchandiseDetails.color.map((c, i) => (
                              <option key={i} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {event.merchandiseDetails.variants && event.merchandiseDetails.variants.length > 0 && (
                        <div className="form-group">
                          <label>Variant</label>
                          <select
                            value={merchandiseOptions.variant}
                            onChange={(e) => setMerchandiseOptions({...merchandiseOptions, variant: e.target.value})}
                          >
                            <option value="">Select Variant</option>
                            {event.merchandiseDetails.variants.map((v, i) => (
                              <option key={i} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {event.merchandiseDetails.stockQuantity !== undefined && (
                        <p className="stock-info">
                          📦 {event.merchandiseDetails.stockQuantity > 0 
                            ? `${event.merchandiseDetails.stockQuantity} items in stock` 
                            : '⚠️ Out of stock'}
                        </p>
                      )}

                      {/* Payment Proof Upload */}
                      <div className="payment-proof-section">
                        <h4>💳 Payment Proof</h4>
                        <p className="hint-text">Upload a screenshot of your payment (UPI/bank transfer)</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofUpload}
                          className="file-input"
                        />
                        {paymentProofPreview && (
                          <div className="proof-preview">
                            <img src={paymentProofPreview} alt="Payment proof" />
                            <button 
                              type="button" 
                              onClick={() => { setPaymentProof(null); setPaymentProofPreview(null); }}
                              className="btn btn-sm btn-danger"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {event.customFormFields && event.customFormFields.length > 0 && (
                    <div className="custom-form">
                      <h4>Additional Information</h4>
                      {event.customFormFields.map((field, index) => (
                        <div key={index} className="form-group">
                          <label>
                            {field.fieldName}
                            {field.required && <span className="required">*</span>}
                          </label>
                          {field.fieldType === 'text' && (
                            <input
                              type="text"
                              required={field.required}
                              onChange={(e) =>
                                handleCustomFormChange(field.fieldName, e.target.value)
                              }
                            />
                          )}
                          {field.fieldType === 'number' && (
                            <input
                              type="number"
                              required={field.required}
                              placeholder="Enter number"
                              min="0"
                              step="1"
                              onKeyPress={(e) => {
                                // Prevent non-numeric characters
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) =>
                                handleCustomFormChange(field.fieldName, e.target.value)
                              }
                            />
                          )}
                          {field.fieldType === 'checkbox' && (
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                required={field.required}
                                onChange={(e) =>
                                  handleCustomFormChange(field.fieldName, e.target.checked)
                                }
                              />
                              <span className="checkbox-label">Yes, I agree</span>
                            </div>
                          )}
                          {field.fieldType === 'file' && (
                            <input
                              type="file"
                              required={field.required}
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error('File size must be less than 5MB');
                                    e.target.value = '';
                                    return;
                                  }
                                  // Convert to base64
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    handleCustomFormChange(field.fieldName, ev.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          )}
                          {field.fieldType === 'dropdown' && (
                            <select
                              required={field.required}
                              onChange={(e) =>
                                handleCustomFormChange(field.fieldName, e.target.value)
                              }
                            >
                              <option value="">Select...</option>
                              {field.options?.map((option, i) => (
                                <option key={i} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={handleRegister}
                    className="btn btn-success"
                    disabled={registering}
                    style={{ width: '100%', marginTop: '15px' }}
                  >
                    {registering ? 'Registering...' : 'Register Now'}
                  </button>
                </>
              ) : (
                <div className="registration-closed">
                  <p>Registration is currently closed</p>
                </div>
              )}
            </div>

            {/* Add to Calendar Card */}
            <div className="calendar-card card">
              <h3>📅 Add to Calendar</h3>
              <p className="calendar-hint">Never miss this event!</p>
              <div className="calendar-buttons">
                <button onClick={addToGoogleCalendar} className="btn btn-sm btn-primary">
                  Google Calendar
                </button>
                <button onClick={addToOutlook} className="btn btn-sm btn-secondary">
                  Outlook
                </button>
                <button onClick={downloadICS} className="btn btn-sm btn-secondary">
                  📥 Download .ics
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Discussion Forum - For registered participants and organizer */}
        {(isAlreadyRegistered || (user?.role === 'organizer' && event.organizer?._id === (user.id || user._id))) && (
          <DiscussionForum eventId={event._id} />
        )}
      </div>
    </div>
  );
};

export default EventDetails;
