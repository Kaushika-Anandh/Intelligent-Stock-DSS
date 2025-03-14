// src/components/PrivateRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('jwt_token');
  const location = useLocation();

  if (!token) {
    // If no token, redirect to login page and pass the current location for later use.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
