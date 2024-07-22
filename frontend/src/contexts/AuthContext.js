// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { backendEndpoint } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ name: "", isAuthenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${backendEndpoint}/api/auth/status`, { withCredentials: true });
        if (response.status === 200) {
          const username = response.data.user.username;
          setUser({ name: username, isAuthenticated: true });
          // console.log("User authenticated:", response.data.user);
        }
      } catch (err) {
        console.log("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${backendEndpoint}/api/auth/logout`, {}, { withCredentials: true });
      setUser({...user, isAuthenticated: false})
    } catch (err) {
      console.error("Failed to logout", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
