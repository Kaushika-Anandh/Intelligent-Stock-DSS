import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './css/Results.css';

function Results() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          setError('JWT token not found.');
          return;
        }
        
        let decoded;
        try {
          decoded = jwtDecode(token);
        } catch (err) {
          setError('Invalid token.');
          return;
        }
      
        // Extract the email from the decoded token (assuming it's nested under user)
        const email = decoded.user?.email;
        if (!email) {
          setError('User email not found.');
          return;
        }

        
        // Fixed: changed Params to lowercase params
        const response = await axios.get('http://localhost:5000/api/v1/user/user-profile', { 
          params: { email: email } 
        });
      
        setProfile(response.data.profile_data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile results: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    
    // Another issue: infinite loop because of no dependency array and condition always true
    // Changed to proper dependency array
    fetchProfile();
  }, []);  // Empty dependency array so it only runs once

  const getScoreColor = (score) => {
    if (score <= 3) return '#FF4B4B';
    if (score <= 6) return '#FFA500';
    return '#4CAF50';
  };

  const renderWeightedScores = () => {
    return (
      <div className="weighted-scores-section">
        <h3>Category Weights Impact</h3>
        <div className="weighted-scores-grid">
          {Object.entries(profile.weighted_scores).map(([category, score]) => (
            <div key={category} className="weighted-score-item">
              <div className="weighted-score-label">
                {category.replace('_', ' ').toUpperCase()}
              </div>
              <div className="weighted-score-value">
                {(score * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-spinner">Loading your profile...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!profile) return <div className="error-message">Profile not found.</div>;

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>✅ Financial Profile Complete!</h2>
      </div>
      
      <div className="results-content">
        <div className="results-section profile-section">
          <h3>Your Risk Profile</h3>
          <div className="profile-score">
            <div className="score-circle" style={{
              background: `conic-gradient(${getScoreColor(profile.final_score)} ${profile.final_score * 36}deg, #f0f0f0 0deg)`
            }}>
              <span>{profile.final_score.toFixed(2)}</span>
            </div>
            <div className="profile-type">
              <h4>{profile.risk_profile}</h4>
              <p>{profile.profile_description}</p>
            </div>
          </div>
        </div>
        
        <div className="results-section breakdown-section">
          <h3>Category Breakdown</h3>
          {Object.entries(profile.category_scores).map(([category, score]) => (
            <div key={category} className="category-score">
              <span className="category-name">{category.replace('_', ' ').toUpperCase()}</span>
              <div className="score-bar-container">
                <div 
                  className="score-bar" 
                  style={{ 
                    width: `${score * 10}%`,
                    backgroundColor: getScoreColor(score)
                  }}
                >
                  <span className="score-value">{score.toFixed(2)}/10</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {profile.weighted_scores && renderWeightedScores()}
      </div>
      
      <div className="results-footer">
        <p>Thank you for completing the questionnaire!</p>
        <div className="action-buttons">
          <button className="primary-button" onClick={() => navigate('/')}>
            Start Over
          </button>
          <button className="secondary-button" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
          <button className="download-button" onClick={() => window.print()}>
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;