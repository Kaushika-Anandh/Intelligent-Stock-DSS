import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './css/Home.css'; // Make sure this CSS file is in the same directory

const Home = () => {
  const [isNewUser, setIsNewUser] = useState(null); // null until determined
  const navigate = useNavigate();

  // Decode token and determine if the user is new
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsNewUser(decoded.user.is_new);
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
  }, []);

  // Redirect non-new users once we know the value
  useEffect(() => {
    if (isNewUser === false) {
      navigate('/dashboard');
    }
  }, [isNewUser, navigate]);

  const handleProceed = () => {
    navigate('/onboarding');
  };

  // Render a loading state until the token is decoded
  if (isNewUser === null) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Welcome To Monte</h1>
      {isNewUser && (
        <div>
          <p>Go to onboarding process</p>
          
          <div className="button-icon" onClick={handleProceed}>
            <div className="icon">
              <span className="arrow">&gt;&gt;&gt;</span>
            </div>
            <div className="cube">
              <span className="side front">Take a short questionnaire</span>
              <span className="side top">Proceed to user onboard</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;