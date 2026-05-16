import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

const AuthContext = createContext(null);

function getStoredTokenForCurrentRoute(pathname = window.location.pathname || '') {
  const path = pathname;

  if (path.startsWith('/facilitator')) {
    return localStorage.getItem('spartang_facilitator_token')
      || localStorage.getItem('spartang_student_token')
      || localStorage.getItem('spartang_token')
      || '';
  }

  if (path.startsWith('/student')) {
    return localStorage.getItem('spartang_student_token')
      || localStorage.getItem('spartang_facilitator_token')
      || localStorage.getItem('spartang_token')
      || '';
  }

  return localStorage.getItem('spartang_student_token')
    || localStorage.getItem('spartang_facilitator_token')
    || localStorage.getItem('spartang_token')
    || '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const initialToken = getStoredTokenForCurrentRoute(location?.pathname);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));

  useEffect(() => {
    // Keep token selection in sync with route changes so the appropriate
    // stored token is used when navigating between student/facilitator areas.
    const stored = getStoredTokenForCurrentRoute(location?.pathname);
    if (stored && stored !== token) {
      setToken(stored);
    }

    if (!token) {
      // No token — not loading and clear any user
      setLoading(false);
      setUser(null);
      return;
    }

    // When a token is present, we are loading the profile
    setLoading(true);

    let active = true;
    api.get('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data.user);
        }
      })
      .catch((err) => {
        const msg = String(err?.message || '');
        // Only clear local token on explicit authentication errors (invalid/expired/unauthorized).
        // Preserve the token for transient network/server failures so navigation to public pages
        // (like Emergency Resources) does not sign the user out.
        if (/invalid|expired|unauthorized|401|403|authentication/i.test(msg)) {
          // Clear both stored tokens on explicit authentication errors
          localStorage.removeItem('spartang_facilitator_token');
          localStorage.removeItem('spartang_student_token');
          setToken('');
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, location?.pathname]);

  async function loginStudent(credentials) {
    const data = await api.post('/auth/student/login', credentials);
    // Store student token under separate key to avoid overwriting facilitator token
    localStorage.setItem('spartang_student_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function loginFacilitator(credentials) {
    const data = await api.post('/auth/facilitator/login', credentials);
    // Store facilitator token under its own key
    localStorage.setItem('spartang_facilitator_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signupStudent(payload) {
    const data = await api.post('/auth/student/signup', payload);
    localStorage.setItem('spartang_student_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signupFacilitator(payload) {
    const data = await api.post('/auth/facilitator/signup', payload);
    localStorage.setItem('spartang_facilitator_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    // Remove both tokens when logging out to avoid stale credentials
    localStorage.removeItem('spartang_facilitator_token');
    localStorage.removeItem('spartang_student_token');
    setToken('');
    setUser(null);
  }

  async function refreshProfile() {
    const data = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    loginStudent,
    loginFacilitator,
    signupStudent,
    signupFacilitator,
    logout,
    refreshProfile,
    setUser,
    setToken
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}