import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { PREDEFINED_INTERESTS } from '../constants/interests';
import './CreateEvent.css';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Form Builder (Normal) or Merchandise Details
  const [organizers, setOrganizers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'Normal',
    eligibility: 'All',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    registrationFee: 0,
    registrationLimit: '',
    tags: [], // Changed from string to array
    organizer: '', // For admin to select organizer
    // Merchandise specific
    merchandiseDetails: {
      size: [],
      color: [],
      variants: [],
      stockQuantity: 0,
      purchaseLimit: 1
    }
  });

  // Fetch organizers if user is admin
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOrganizers();
    }
  }, [user]);

  const fetchOrganizers = async () => {
    try {
      const { data } = await api.get('/admin/organizers');
      setOrganizers(data.data);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      toast.error('Failed to load organizers');
    }
  };

  const [customFormFields, setCustomFormFields] = useState([]);
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'text',
    options: '',
    required: false,
    order: 0
  });

  // Merchandise options
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [variantInput, setVariantInput] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTagToggle = (tag) => {
    if (formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: formData.tags.filter(t => t !== tag)
      });
    } else {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
  };

  const handleMerchandiseChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      merchandiseDetails: {
        ...formData.merchandiseDetails,
        [name]: value
      }
    });
  };

  const addSize = () => {
    if (sizeInput.trim()) {
      setFormData({
        ...formData,
        merchandiseDetails: {
          ...formData.merchandiseDetails,
          size: [...formData.merchandiseDetails.size, sizeInput.trim()]
        }
      });
      setSizeInput('');
    }
  };

  const removeSize = (index) => {
    const newSizes = formData.merchandiseDetails.size.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      merchandiseDetails: { ...formData.merchandiseDetails, size: newSizes }
    });
  };

  const addColor = () => {
    if (colorInput.trim()) {
      setFormData({
        ...formData,
        merchandiseDetails: {
          ...formData.merchandiseDetails,
          color: [...formData.merchandiseDetails.color, colorInput.trim()]
        }
      });
      setColorInput('');
    }
  };

  const removeColor = (index) => {
    const newColors = formData.merchandiseDetails.color.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      merchandiseDetails: { ...formData.merchandiseDetails, color: newColors }
    });
  };

  const addVariant = () => {
    if (variantInput.trim()) {
      setFormData({
        ...formData,
        merchandiseDetails: {
          ...formData.merchandiseDetails,
          variants: [...formData.merchandiseDetails.variants, variantInput.trim()]
        }
      });
      setVariantInput('');
    }
  };

  const removeVariant = (index) => {
    const newVariants = formData.merchandiseDetails.variants.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      merchandiseDetails: { ...formData.merchandiseDetails, variants: newVariants }
    });
  };

  // Form Builder Functions
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField({
      ...newField,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const addFormField = () => {
    if (!newField.fieldName.trim()) {
      toast.error('Please enter field name');
      return;
    }

    const field = {
      ...newField,
      options: newField.fieldType === 'dropdown' ? newField.options.split(',').map(o => o.trim()) : [],
      order: customFormFields.length
    };

    setCustomFormFields([...customFormFields, field]);
    setNewField({
      fieldName: '',
      fieldType: 'text',
      options: '',
      required: false,
      order: 0
    });
    toast.success('Field added');
  };

  const removeFormField = (index) => {
    setCustomFormFields(customFormFields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newFields = [...customFormFields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    newFields.forEach((field, i) => field.order = i);
    setCustomFormFields(newFields);
  };

  const moveFieldDown = (index) => {
    if (index === customFormFields.length - 1) return;
    const newFields = [...customFormFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    newFields.forEach((field, i) => field.order = i);
    setCustomFormFields(newFields);
  };

  const handleNext = () => {
    // Validation for step 1
    if (!formData.name.trim()) {
      toast.error('Please enter event name');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter event description');
      return;
    }
    if (!formData.startDate || !formData.endDate || !formData.registrationDeadline) {
      toast.error('Please fill all date fields');
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e, saveAs = 'Draft') => {
    e.preventDefault();

    // Validate admin has selected an organizer
    if (user?.role === 'admin' && !formData.organizer) {
      toast.error('Please select an organizer for this event');
      return;
    }

    try {
      const eventData = {
        ...formData,
        tags: formData.tags, // Already an array
        status: saveAs,
        customFormFields: formData.eventType === 'Normal' ? customFormFields : [],
        merchandiseDetails: formData.eventType === 'Merchandise' ? formData.merchandiseDetails : undefined
      };

      await api.post('/events', eventData);
      toast.success(`Event ${saveAs === 'Draft' ? 'saved as draft' : 'published'} successfully!`);
      
      // Redirect based on user role
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/organizer/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    }
  };

  return (
    <div className="container create-event-container">
      <div className="create-event-header">
        <h1> Create New Event</h1>
        <p>Fill in the details to create your event</p>
      </div>

      <div className="progress-steps">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Basic Information</div>
        </div>
        <div className="progress-line-step"></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">
            {formData.eventType === 'Normal' ? 'Registration Form' : 'Merchandise Details'}
          </div>
        </div>
      </div>

      <form className="create-event-form card">
        {step === 1 && (
          <div className="form-step">
            <h2>Basic Event Information</h2>

            {/* Admin Organizer Selection */}
            {user?.role === 'admin' && (
              <div className="form-group">
                <label>Select Organizer (Club) *</label>
                <select 
                  name="organizer" 
                  value={formData.organizer} 
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select an Organizer --</option>
                  {organizers.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name} ({org.category})
                    </option>
                  ))}
                </select>
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Select which club/organizer this event belongs to
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Event Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter event name"
                required
              />
            </div>

            <div className="form-group">
              <label>Event Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event"
                rows="5"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Event Type *</label>
                <select name="eventType" value={formData.eventType} onChange={handleChange}>
                  <option value="Normal">Normal Event</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>

              <div className="form-group">
                <label>Eligibility *</label>
                <select name="eligibility" value={formData.eligibility} onChange={handleChange}>
                  <option value="All">All</option>
                  <option value="IIIT">IIIT Only</option>
                  <option value="Non-IIIT">Non-IIIT Only</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date & Time *</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Registration Deadline *</label>
              <input
                type="datetime-local"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{formData.eventType === 'Merchandise' ? 'Merchandise Price (₹)' : 'Registration Fee (₹)'}</label>
                <input
                  type="number"
                  name="registrationFee"
                  value={formData.registrationFee}
                  onChange={handleChange}
                  min="0"
                />
                {formData.eventType === 'Merchandise' && (
                  <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                    This is the cost of the merchandise only (no separate registration fee)
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Registration Limit</label>
                <input
                  type="number"
                  name="registrationLimit"
                  value={formData.registrationLimit}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tags / Categories *</label>
              <p className="hint-text" style={{ marginBottom: '10px' }}>
                Select relevant tags to help participants discover your event through personalized recommendations
              </p>
              <div className="interests-grid">
                {PREDEFINED_INTERESTS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`interest-tag ${formData.tags.includes(tag) ? 'selected' : ''}`}
                  >
                    {tag}
                    {formData.tags.includes(tag) && <span className="check-icon"></span>}
                  </button>
                ))}
              </div>
              {formData.tags.length > 0 && (
                <p className="selected-count">
                  {formData.tags.length} tag{formData.tags.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleNext} className="btn btn-primary">
                Next 
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.eventType === 'Normal' && (
          <div className="form-step">
            <h2> Custom Registration Form Builder</h2>
            <p className="form-hint">Create custom fields for participants to fill during registration</p>

            {/* Add New Field */}
            <div className="form-builder-section card">
              <h3>Add Form Field</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Field Name *</label>
                  <input
                    type="text"
                    name="fieldName"
                    value={newField.fieldName}
                    onChange={handleFieldChange}
                    placeholder="e.g., Team Name, College"
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
                  <label>Dropdown Options (comma-separated)</label>
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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="required"
                    checked={newField.required}
                    onChange={handleFieldChange}
                  />
                  Required Field
                </label>
              </div>

              <button type="button" onClick={addFormField} className="btn btn-primary btn-sm">
                + Add Field
              </button>
            </div>

            {/* Form Fields Preview */}
            {customFormFields.length > 0 && (
              <div className="form-fields-preview">
                <h3>Form Fields ({customFormFields.length})</h3>
                <div className="fields-list">
                  {customFormFields.map((field, index) => (
                    <div key={index} className="field-item">
                      <div className="field-info">
                        <strong>{field.fieldName}</strong>
                        <span className="field-type-badge">{field.fieldType}</span>
                        {field.required && <span className="required-badge">Required</span>}
                        {field.fieldType === 'dropdown' && (
                          <span className="options-preview">Options: {field.options.join(', ')}</span>
                        )}
                      </div>
                      <div className="field-actions">
                        <button type="button" onClick={() => moveFieldUp(index)} disabled={index === 0}>
                          
                        </button>
                        <button type="button" onClick={() => moveFieldDown(index)} disabled={index === customFormFields.length - 1}>
                          
                        </button>
                        <button type="button" onClick={() => removeFormField(index)} className="btn-danger-sm">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleBack} className="btn btn-secondary">
                 Back
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, 'Draft')} className="btn btn-secondary">
                Save as Draft
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, 'Published')} className="btn btn-primary">
                Publish Event
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.eventType === 'Merchandise' && (
          <div className="form-step">
            <h2> Merchandise Details</h2>

            <div className="form-group">
              <label>Sizes</label>
              <div className="array-input">
                <input
                  type="text"
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  placeholder="Add size (e.g., S, M, L, XL)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                />
                <button type="button" onClick={addSize} className="btn btn-sm btn-primary">
                  + Add
                </button>
              </div>
              <div className="tags-display">
                {formData.merchandiseDetails.size.map((size, index) => (
                  <span key={index} className="tag-item">
                    {size}
                    <button type="button" onClick={() => removeSize(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Colors</label>
              <div className="array-input">
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="Add color"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                />
                <button type="button" onClick={addColor} className="btn btn-sm btn-primary">
                  + Add
                </button>
              </div>
              <div className="tags-display">
                {formData.merchandiseDetails.color.map((color, index) => (
                  <span key={index} className="tag-item">
                    {color}
                    <button type="button" onClick={() => removeColor(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Variants (Optional)</label>
              <div className="array-input">
                <input
                  type="text"
                  value={variantInput}
                  onChange={(e) => setVariantInput(e.target.value)}
                  placeholder="Add variant (e.g., Hoodie, T-Shirt)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
                />
                <button type="button" onClick={addVariant} className="btn btn-sm btn-primary">
                  + Add
                </button>
              </div>
              <div className="tags-display">
                {formData.merchandiseDetails.variants.map((variant, index) => (
                  <span key={index} className="tag-item">
                    {variant}
                    <button type="button" onClick={() => removeVariant(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Stock Quantity *</label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.merchandiseDetails.stockQuantity}
                  onChange={handleMerchandiseChange}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Purchase Limit per Participant</label>
                <input
                  type="number"
                  name="purchaseLimit"
                  value={formData.merchandiseDetails.purchaseLimit}
                  onChange={handleMerchandiseChange}
                  min="1"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleBack} className="btn btn-secondary">
                 Back
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, 'Draft')} className="btn btn-secondary">
                Save as Draft
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, 'Published')} className="btn btn-primary">
                Publish Event
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateEvent;
