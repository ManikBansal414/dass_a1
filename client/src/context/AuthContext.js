import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const { data } = await axios.get('/api/auth/me', config);
      setUser(data.data);
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, role) => {
    try {
      const { data } = await axios.post('/api/auth/login', {
        email,
        password,
        role
      });
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post('/api/auth/register', userData);
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
