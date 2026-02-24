import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    participantType: 'IIIT',
    college: '',
    contactNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.participantType === 'IIIT' && !formData.email.endsWith('@iiit.ac.in') && 
        !formData.email.endsWith('@students.iiit.ac.in') && !formData.email.endsWith('@research.iiit.ac.in')) {
      toast.error('IIIT students must use IIIT email ID (@iiit.ac.in, @students.iiit.ac.in, or @research.iiit.ac.in)');
      return;
    }

    if (formData.participantType === 'Non-IIIT' && !formData.college) {
      toast.error('Please enter your college name');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    if (result.success) {
      toast.success('Registration successful! Setting up your preferences...');
      navigate('/onboarding');
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register for Felicity</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="First name"
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
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Participant Type *</label>
            <select
              name="participantType"
              value={formData.participantType}
              onChange={handleChange}
              required
            >
              <option value="IIIT">IIIT Student</option>
              <option value="Non-IIIT">Non-IIIT Participant</option>
            </select>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={
                formData.participantType === 'IIIT'
                  ? 'your.name@iiit.ac.in'
                  : 'your.email@example.com'
              }
            />
            {formData.participantType === 'IIIT' && (
              <small className="form-hint">
                Must use IIIT email (@iiit.ac.in, @students.iiit.ac.in, or @research.iiit.ac.in)
              </small>
            )}
          </div>

          {formData.participantType === 'Non-IIIT' && (
            <div className="form-group">
              <label>College/Organization *</label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                required={formData.participantType === 'Non-IIIT'}
                placeholder="Your college or organization"
              />
            </div>
          )}

          <div className="form-group">
            <label>Contact Number *</label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
