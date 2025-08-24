import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('drafteam_token'));

  // Team members list
  const teamMembers = [
    { id: 1, name: 'Adip', role: 'Senior Draftsman' },
    { id: 2, name: 'Elyas', role: 'Junior Draftsman' },
    { id: 3, name: 'Syahmi', role: 'Junior Draftsman' },
    { id: 4, name: 'Alip', role: 'Junior Draftsman' }
  ];

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Decode token to get user info
          const decoded = atob(token);
          const [username] = decoded.split(':');
          
          const foundUser = teamMembers.find(member => 
            member.name.toLowerCase() === username.toLowerCase()
          );
          
          if (foundUser) {
            setUser(foundUser);
          } else {
            // Invalid token, remove it
            localStorage.removeItem('drafteam_token');
            setToken(null);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          localStorage.removeItem('drafteam_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        const { user: userData, token: authToken } = response.data;
        
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('drafteam_token', authToken);
        
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('drafteam_token');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    teamMembers,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};