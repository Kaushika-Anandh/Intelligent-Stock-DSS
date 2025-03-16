import React, { useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { firebaseConfig } from './firebase_config';
import './css/Login.css'; // Import the CSS

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const Login = () => {
  const navigate = useNavigate();
  const imageRef = useRef(null);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      // Send Firebase ID token to backend
      const response = await axios.post('http://localhost:5000/api/v1/login', { id_token: idToken });
      const jwt = response.data.token;
      // Store JWT in localStorage
      localStorage.setItem('jwt_token', jwt);
      navigate('/home');
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  // OPTIONAL: Subtle image movement on mouse hover (remove if not needed)
  const handleMouseMove = (event) => {
    if (!imageRef.current) return;
    const { clientX, clientY, currentTarget } = event;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();

    // Calculate the mouse position relative to the container’s center
    const xPos = (clientX - left) / width - 0.5; // Range -0.5 to +0.5
    const yPos = (clientY - top) / height - 0.5; // Range -0.5 to +0.5

    // Multiply by some factor for subtle movement (e.g., ±10px)
    const translateX = xPos * 30;
    const translateY = yPos * 30;

    imageRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
  };

  // Reset the transform when mouse leaves
  const handleMouseLeave = () => {
    if (!imageRef.current) return;
    imageRef.current.style.transform = 'translate(0, 0)';
  };

  return (
    <div className="login-page">
      {/* A "card" that contains both the image and the form */}
      <div className="login-card">
        {/* Left Section: Image */}
        <div
          className="image-section"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Replace 'URL' with your actual image link */}
          <img ref={imageRef} src="https://cdni.iconscout.com/illustration/premium/thumb/trader-illustration-download-in-svg-png-gif-file-formats--businessman-entrepreneur-business-person-stockbroker-web-pack-people-illustrations-3734473.png" alt="Login illustration" />
        </div>

        {/* Right Section: Form/Content */}
        <div className="form-section">
          
          <h1>Welcome to MONTE!</h1>
          <p>Enter your email and password</p>

          <h2>Login</h2>
          <button onClick={handleGoogleLogin}>Login with Google</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
