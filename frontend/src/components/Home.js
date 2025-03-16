import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

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
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome To Monte</h1>
      {isNewUser && (
        <div>
          <p>Go to onboarding process</p>
          <button onClick={handleProceed}>Proceed</button>
        </div>
      )}
    </div>
  );
};

export default Home;
