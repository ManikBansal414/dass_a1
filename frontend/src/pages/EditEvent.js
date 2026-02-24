import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { PREDEFINED_INTERESTS } from '../constants/interests';
import './CreateEvent.css';

const EditEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: '',
    registrationDeadline: '',
    registrationLimit: '',
    status: ''
  });

  // Form Builder state
  const [customFormFields, setCustomFormFields] = useState([]);
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'text',
    options: '',
    required: false
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      const eventData = data.data;
      setEvent(eventData);
      
      // Set form data based on event status
      if (eventData.status === 'Draft') {
        // For Draft: Load all fields for editing
        setFormData({
          name: eventData.name,
          description: eventData.description,
          eventType: eventData.eventType,
          eligibility: eventData.eligibility,
          startDate: eventData.startDate?.split('T')[0],
          endDate: eventData.endDate?.split('T')[0],
          registrationDeadline: eventData.registrationDeadline?.split('T')[0],
          registrationFee: eventData.registrationFee,
          registrationLimit: eventData.registrationLimit || '',
          tags: eventData.tags || [],
          status: eventData.status
        });
        // Load existing custom form fields
        setCustomFormFields(eventData.customFormFields || []);
      } else if (eventData.status === 'Published') {
        // For Published: Only editable fields
        setFormData({
          description: eventData.description,
          registrationDeadline: eventData.registrationDeadline?.split('T')[0],
          registrationLimit: eventData.registrationLimit || '',
          status: eventData.status
        });
      } else {
        // For Ongoing/Closed: Only status
        setFormData({
          status: eventData.status
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Form Builder handlers
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField({ ...newField, [name]: type === 'checkbox' ? checked : value });
  };

  const addFormField = () => {
    if (!newField.fieldName.trim()) {
      toast.error('Please enter a field name');
      return;
    }
    const field = {
      ...newField,
      options: newField.fieldType === 'dropdown'
        ? newField.options.split(',').map(o => o.trim()).filter(o => o)
        : [],
      order: customFormFields.length
    };
    setCustomFormFields([...customFormFields, field]);
    setNewField({ fieldName: '', fieldType: 'text', options: '', required: false });
    toast.success('Field added');
  };

  const removeFormField = (index) => {
    const updated = customFormFields.filter((_, i) => i !== index);
    updated.forEach((f, i) => { f.order = i; });
    setCustomFormFields(updated);
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const updated = [...customFormFields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((f, i) => { f.order = i; });
    setCustomFormFields(updated);
  };

  const moveFieldDown = (index) => {
    if (index === customFormFields.length - 1) return;
    const updated = [...customFormFields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((f, i) => { f.order = i; });
    setCustomFormFields(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let updateData = {};

      if (event.status === 'Draft') {
        // Draft: Can update all fields including custom form
        updateData = {
          ...formData,
          tags: formData.tags || [],
          customFormFields
        };
      } else if (event.status === 'Published') {
        // Published: Only specific fields
        updateData = {
          description: formData.description,
          registrationDeadline: formData.registrationDeadline,
          registrationLimit: formData.registrationLimit ? parseInt(formData.registrationLimit) : null,
          status: formData.status
        };
      } else {
        // Ongoing/Closed: Only status
        updateData = {
          status: formData.status
        };
      }

      await api.put(`/events/${eventId}`, updateData);
      toast.success('Event updated successfully!');
      navigate('/organizer/dashboard');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error.response?.data?.message || 'Failed to update event');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!event) {
    return <div className="container"><p>Event not found</p></div>;
  }

  const isDraft = event.status === 'Draft';
  const isPublished = event.status === 'Published';
  const isOngoingOrClosed = ['Ongoing', 'Closed'].includes(event.status);
  const hasRegistrations = event.registrationCount > 0;

  return (
    <div className="container create-event-page">
      <div className="page-header">
        <h1> Edit Event</h1>
        <p className="subtitle">Current Status: <strong>{event.status}</strong></p>
      </div>

      {/* Editing Rules Info */}
      <div className="alert alert-info" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}> Editing Rules:</h4>
        {isDraft && (
          <p style={{ margin: 0 }}>
            <strong>Draft Mode:</strong> You can edit all fields and publish the event when ready.
          </p>
        )}
        {isPublished && (
          <div>
            <p style={{ margin: '0 0 5px 0' }}><strong>Published Mode:</strong> Limited editing allowed:</p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li> Description updates</li>
              <li> Extend registration deadline (cannot reduce)</li>
              <li> Increase registration limit (cannot reduce below {event.registrationCount} current registrations)</li>
              <li> Close registrations or mark as Ongoing</li>
              <li> Cannot edit: Name, dates, fees, form fields</li>
              {hasRegistrations && <li> Custom form is locked after first registration</li>}
            </ul>
          </div>
        )}
        {isOngoingOrClosed && (
          <p style={{ margin: 0 }}>
            <strong>{event.status} Mode:</strong> Only status changes allowed (mark as Closed/Completed).
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="event-form card">
        {/* Read-only fields for Published/Ongoing/Closed */}
        {!isDraft && (
          <div className="read-only-section" style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Event Information (Read-only)</h3>
            <div className="info-grid">
              <div><strong>Name:</strong> {event.name}</div>
              <div><strong>Type:</strong> {event.eventType}</div>
              <div><strong>Start Date:</strong> {new Date(event.startDate).toLocaleDateString()}</div>
              <div><strong>End Date:</strong> {new Date(event.endDate).toLocaleDateString()}</div>
              <div><strong>Fee:</strong> ₹{event.registrationFee}</div>
              <div><strong>Registrations:</strong> {event.registrationCount} / {event.registrationLimit || '∞'}</div>
            </div>
          </div>
        )}

        {/* Editable fields based on status */}
        {isDraft && (
          <>
            <div className="form-group">
              <label>Event Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Event Type *</label>
                <select name="eventType" value={formData.eventType} onChange={handleChange} required disabled>
                  <option value="Normal">Normal</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
                <small>Cannot change event type after creation</small>
              </div>

              <div className="form-group">
                <label>Eligibility *</label>
                <select name="eligibility" value={formData.eligibility} onChange={handleChange} required>
                  <option value="All">All</option>
                  <option value="IIIT">IIIT Students Only</option>
                  <option value="Non-IIIT">Non-IIIT Only</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Registration Fee (₹)</label>
                <input
                  type="number"
                  name="registrationFee"
                  value={formData.registrationFee}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Tags / Categories</label>
                <div className="interests-grid">
                  {PREDEFINED_INTERESTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const tags = formData.tags.includes(tag)
                          ? formData.tags.filter(t => t !== tag)
                          : [...formData.tags, tag];
                        setFormData({ ...formData, tags });
                      }}
                      className={`interest-tag ${formData.tags.includes(tag) ? 'selected' : ''}`}
                    >
                      {tag}
                      {formData.tags.includes(tag) && <span className="check-icon"></span>}
                    </button>
                  ))}
                </div>
                {formData.tags.length > 0 && (
                  <p className="selected-count">{formData.tags.length} tag{formData.tags.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Description - Editable for Draft and Published */}
        {(isDraft || isPublished) && (
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              required
            />
          </div>
        )}

        {/*  Form Builder  Only shown for Normal Draft events  */}
        {isDraft && formData.eventType === 'Normal' && (
          <div className="form-builder-section" style={{ marginTop: '30px' }}>
            <h3 style={{ borderBottom: '2px solid #667eea', paddingBottom: '10px', marginBottom: '20px' }}>
               Custom Registration Form Builder
            </h3>

            {hasRegistrations ? (
              /* LOCKED — show read-only field list */
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                   <strong>Form is locked</strong> — {event.registrationCount} registration(s) already received.
                </p>
                {customFormFields.length === 0 ? (
                  <p style={{ color: '#666', margin: 0 }}>No custom fields were defined for this event.</p>
                ) : (
                  <div className="fields-list">
                    {customFormFields.map((field, index) => (
                      <div key={index} className="field-item" style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 600 }}>{field.fieldName}</span>
                        <span className="field-type-badge" style={{ background: '#667eea', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{field.fieldType}</span>
                        {field.required && <span style={{ background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>Required</span>}
                        {field.fieldType === 'dropdown' && field.options?.length > 0 && (
                          <span style={{ color: '#666', fontSize: '13px' }}>Options: {field.options.join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* EDITABLE — full form builder */
              <>
                {/* Add New Field */}
                <div className="add-field-form" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
                  <h4 style={{ margin: '0 0 15px 0' }}> Add New Field</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Field Name *</label>
                      <input
                        type="text"
                        name="fieldName"
                        value={newField.fieldName}
                        onChange={handleFieldChange}
                        placeholder="e.g., Team Name, College ID"
                      />
                    </div>
                    <div className="form-group">
                      <label>Field Type *</label>
                      <select name="fieldType" value={newField.fieldType} onChange={handleFieldChange}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>
                  </div>

                  {newField.fieldType === 'dropdown' && (
                    <div className="form-group">
                      <label>Options (comma-separated)</label>
                      <input
                        type="text"
                        name="options"
                        value={newField.options}
                        onChange={handleFieldChange}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="required"
                        checked={newField.required}
                        onChange={handleFieldChange}
                      />
                      Mark as Required
                    </label>
                  </div>

                  <button type="button" onClick={addFormField} className="btn btn-primary btn-sm">
                    + Add Field
                  </button>
                </div>

                {/* Current Fields Preview */}
                {customFormFields.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px', border: '2px dashed #ddd', borderRadius: '8px' }}>
                    No fields added yet. Add fields above to build your registration form.
                  </p>
                ) : (
                  <div className="form-fields-preview">
                    <h4> Form Fields ({customFormFields.length})</h4>
                    <div className="fields-list">
                      {customFormFields.map((field, index) => (
                        <div key={index} className="field-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '8px' }}>
                          {/* Reorder buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              onClick={() => moveFieldUp(index)}
                              disabled={index === 0}
                              style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '2px 6px', opacity: index === 0 ? 0.3 : 1 }}
                              title="Move up"
                            >▲</button>
                            <button
                              type="button"
                              onClick={() => moveFieldDown(index)}
                              disabled={index === customFormFields.length - 1}
                              style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: index === customFormFields.length - 1 ? 'not-allowed' : 'pointer', padding: '2px 6px', opacity: index === customFormFields.length - 1 ? 0.3 : 1 }}
                              title="Move down"
                            >▼</button>
                          </div>

                          <span style={{ minWidth: '24px', color: '#999', fontSize: '13px' }}>#{index + 1}</span>
                          <strong style={{ flex: 1 }}>{field.fieldName}</strong>
                          <span style={{ background: '#667eea', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{field.fieldType}</span>
                          {field.required && (
                            <span style={{ background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>Required</span>
                          )}
                          {field.fieldType === 'dropdown' && field.options?.length > 0 && (
                            <span style={{ color: '#666', fontSize: '12px' }}>({field.options.join(', ')})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFormField(index)}
                            style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px' }}
                            title="Remove field"
                          ></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Registration Deadline - Editable for Draft and Published */}
        {(isDraft || isPublished) && (
          <div className="form-group">
            <label>Registration Deadline *</label>
            <input
              type="date"
              name="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={handleChange}
              min={isPublished ? event.registrationDeadline?.split('T')[0] : undefined}
              required
            />
            {isPublished && <small>Can only extend deadline, not reduce it</small>}
          </div>
        )}

        {/* Registration Limit - Editable for Draft and Published */}
        {(isDraft || isPublished) && (
          <div className="form-group">
            <label>Registration Limit</label>
            <input
              type="number"
              name="registrationLimit"
              value={formData.registrationLimit}
              onChange={handleChange}
              min={isPublished ? event.registrationCount : 0}
            />
            {isPublished && event.registrationCount > 0 && (
              <small>Minimum: {event.registrationCount} (current registrations)</small>
            )}
            {!formData.registrationLimit && <small>Leave empty for unlimited</small>}
          </div>
        )}

        {/* Status - Editable for all */}
        <div className="form-group">
          <label>Event Status *</label>
          <select name="status" value={formData.status} onChange={handleChange} required>
            {isDraft && (
              <>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </>
            )}
            {isPublished && (
              <>
                <option value="Published">Published</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Closed">Closed</option>
              </>
            )}
            {event.status === 'Ongoing' && (
              <>
                <option value="Ongoing">Ongoing</option>
                <option value="Closed">Closed</option>
              </>
            )}
            {event.status === 'Closed' && (
              <option value="Closed">Closed</option>
            )}
          </select>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Update Event
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEvent;
