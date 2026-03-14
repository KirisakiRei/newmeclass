// @ts-nocheck
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ tokenKey, redirectTo, children }) => {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null;

  if (!token) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
