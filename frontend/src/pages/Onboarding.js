import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { PREDEFINED_INTERESTS } from '../constants/interests';
import './Onboarding.css';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [clubs, setClubs] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const { data } = await api.get('/participant/clubs');
      setClubs(data.data);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const handleInterestToggle = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests([...selectedInterests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleClubToggle = (clubId) => {
    if (selectedClubs.includes(clubId)) {
      setSelectedClubs(selectedClubs.filter(id => id !== clubId));
    } else {
      setSelectedClubs([...selectedClubs, clubId]);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSkip = async () => {
    // Skip onboarding and go to dashboard
    navigate('/participant/dashboard');
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      // Update profile with preferences
      await api.put('/participant/profile', {
        areasOfInterest: selectedInterests,
        followedClubs: selectedClubs
      });

      // Follow selected clubs
      for (const clubId of selectedClubs) {
        try {
          await api.post(`/participant/follow/${clubId}`);
        } catch (error) {
          console.error('Error following club:', error);
        }
      }

      toast.success('Preferences saved successfully!');
      navigate('/participant/dashboard');
    } catch (error) {
      toast.error('Error saving preferences');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to Felicity! </h1>
          <p>Let's personalize your experience</p>
          <div className="progress-bar">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Interests</div>
            </div>
            <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Clubs</div>
            </div>
          </div>
        </div>

        {/* Step 1: Areas of Interest */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2>What are you interested in?</h2>
            <p className="step-description">
              Select your areas of interest to get personalized event recommendations
            </p>

            <div className="interests-grid">
              {PREDEFINED_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`interest-tag ${selectedInterests.includes(interest) ? 'selected' : ''}`}
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                  {selectedInterests.includes(interest) && <span className="check-icon"></span>}
                </button>
              ))}
            </div>

            <div className="custom-interest">
              <h3>Add Custom Interest</h3>
              <div className="custom-interest-input">
                <input
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="Type your interest..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomInterest())}
                />
                <button
                  type="button"
                  onClick={handleAddCustomInterest}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
            </div>

            {selectedInterests.length > 0 && (
              <div className="selected-count">
                {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
              </div>
            )}

            <div className="onboarding-actions">
              <button onClick={handleSkip} className="btn btn-text">
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="btn btn-primary"
                disabled={selectedInterests.length === 0}
              >
                Next 
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Follow Clubs */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2>Follow Clubs & Organizers</h2>
            <p className="step-description">
              Follow clubs to stay updated with their events and announcements
            </p>

            {clubs.length === 0 ? (
              <p className="no-data">No clubs available at the moment</p>
            ) : (
              <div className="clubs-grid">
                {clubs.map((club) => (
                  <div
                    key={club._id}
                    className={`club-card ${selectedClubs.includes(club._id) ? 'selected' : ''}`}
                    onClick={() => handleClubToggle(club._id)}
                  >
                    <div className="club-header">
                      <div className="club-avatar">
                        {club.name.split(' ').map(word => word[0]).join('').substring(0, 2)}
                      </div>
                      <div className="club-info">
                        <h3>{club.name}</h3>
                        <span className="club-category">{club.category}</span>
                      </div>
                      {selectedClubs.includes(club._id) && (
                        <span className="check-icon-large"></span>
                      )}
                    </div>
                    <p className="club-description">{club.description}</p>
                    <div className="club-followers">
                      {club.followers?.length || 0} followers
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedClubs.length > 0 && (
              <div className="selected-count">
                Following {selectedClubs.length} club{selectedClubs.length !== 1 ? 's' : ''}
              </div>
            )}

            <div className="onboarding-actions">
              <button onClick={handleBack} className="btn btn-secondary">
                 Back
              </button>
              <button onClick={handleSkip} className="btn btn-text">
                Skip for now
              </button>
              <button
                onClick={handleFinish}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Finish & Go to Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
