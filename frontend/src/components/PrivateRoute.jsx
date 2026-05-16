import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getStoredAuthToken(requiredRole) {
  if (requiredRole === 'student') {
    return localStorage.getItem('spartang_student_token')
      || localStorage.getItem('spartang_token')
      || '';
  }

  if (requiredRole === 'ogc') {
    return localStorage.getItem('spartang_facilitator_token')
      || localStorage.getItem('spartang_token')
      || '';
  }

  return localStorage.getItem('spartang_student_token')
    || localStorage.getItem('spartang_facilitator_token')
    || localStorage.getItem('spartang_token')
    || '';
}

function decodeTokenPayload(token) {
  try {
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  } catch (error) {
    return null;
  }
}

export function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = getStoredAuthToken(role);
  const payload = decodeTokenPayload(token);
  const isAuthenticated = Boolean(token && (payload?.id || user?.id));
  const currentRole = payload?.role || user?.role || '';

  if (loading) {
    return <div className="page-center">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && currentRole !== role) {
    const fallback = currentRole === 'ogc' ? '/facilitator/dashboard' : '/student/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export function ConsentRoute({ children }) {
  const { user, loading } = useAuth();
  const token = getStoredAuthToken('student');
  const payload = decodeTokenPayload(token);
  const isAuthenticated = Boolean(token && (payload?.id || user?.id));
  const currentRole = payload?.role || user?.role || '';
  const consentFlag = typeof payload?.consentFlag === 'boolean' ? payload.consentFlag : user?.consentFlag;

  if (loading) {
    return <div className="page-center">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== 'student') {
    return <Navigate to="/" replace />;
  }

  if (consentFlag) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}