// src/components/Login.js
import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { firebaseConfig } from './firebase_config';


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const Login = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      // Send Firebase ID token to backend
      const response = await axios.post('http://localhost:5000/api/v1/login', { id_token: idToken });
      const jwt = response.data.token;
      // Store JWT in localStorage for session persistence
      localStorage.setItem('jwt_token', jwt);
      navigate('/home');
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
};

export default Login;
