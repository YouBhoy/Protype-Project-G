import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('spartang_token') || '');
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    api.get('/auth/me')
      .then((data) => {
        if (active) {
          setUser(data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem('spartang_token');
        setToken('');
        setUser(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function loginStudent(credentials) {
    const data = await api.post('/auth/student/login', credentials);
    localStorage.setItem('spartang_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function loginFacilitator(credentials) {
    const data = await api.post('/auth/facilitator/login', credentials);
    localStorage.setItem('spartang_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signupStudent(payload) {
    const data = await api.post('/auth/student/signup', payload);
    localStorage.setItem('spartang_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signupFacilitator(payload) {
    const data = await api.post('/auth/facilitator/signup', payload);
    localStorage.setItem('spartang_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('spartang_token');
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