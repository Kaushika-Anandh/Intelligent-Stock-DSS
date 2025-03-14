// src/components/Home.js
import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    console.log(token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log(decoded);
        setIsNewUser(decoded.user.is_new);
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
  }, []);
  
  const handleProceed = () => {
    // Logic to navigate to the onboarding process
    navigate('/onboarding');
  };
  
  return (
    <div>
      <h1>Welcome To Monte</h1>
      {console.log("is new user in webpage: "+isNewUser)}
      {isNewUser ? (
        <div>
          <p>Go to on boarding process</p>
          <button onClick={handleProceed}>Proceed</button>
        </div>
      ) : (
        navigate('/dashboard')
      )}
    </div>
  );
};

export default Home;
