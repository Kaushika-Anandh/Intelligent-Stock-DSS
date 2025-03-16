import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './css/Results.css';

function Results() {
  const { profileId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Assuming you add an endpoint to get a profile by ID
        const response = await axios.get(`http://localhost:5000/api/v1/profile/${profileId}`);
        setProfile(response.data.profile_data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile results.');
        setLoading(false);
      }
    };
    
    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);
  
  if (loading) {
    return <div className="loading">Loading your profile...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!profile) {
    return <div className="error">Profile not found.</div>;
  }
  
  return (
    <div className="results-container">
      <div className="results-header">
        <h2>✅ Financial Profile Complete!</h2>
      </div>
      
      <div className="results-content">
        <div className="results-section profile-section">
          <h3>Your Risk Profile</h3>
          <div className="profile-name">{profile.risk_profile} ({profile.final_score.toFixed(2)}/10)</div>
          <p className="profile-description">{profile.profile_description}</p>
        </div>
        
        <div className="results-section breakdown-section">
          <h3>Category Breakdown</h3>
          {Object.entries(profile.category_scores).map(([category, score]) => (
            <div key={category} className="category-score">
              <span className="category-name">{category.replace('_', ' ').toUpperCase()}</span>
              <div className="score-bar-container">
                <div className="score-bar" style={{ width: `${score * 10}%` }}></div>
                <span className="score-value">{score.toFixed(2)}/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="results-footer">
        <p>Thank you for completing the questionnaire!</p>
        <button onClick={() => window.location.href = "/"}>
          Start Over
        </button>
        <button onClick={() => window.location.href = "/dashboard"}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default Results;