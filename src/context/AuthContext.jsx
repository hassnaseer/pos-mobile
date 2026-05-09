import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api/globalApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [userModules, setUserModules] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up the 401 unauthorized handler
  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      console.log('Unauthorized error detected - logging out user');
      logout();
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const role = await AsyncStorage.getItem('userRole');
      const storedUser = await AsyncStorage.getItem('userData');
      const storedModules = await AsyncStorage.getItem('userModules');

      if (token && role) {
        setIsAuthenticated(true);
        setUserRole(role);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        if (storedModules) {
          setUserModules(JSON.parse(storedModules));
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, token, role, modules = null) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      if (modules) {
        await AsyncStorage.setItem('userModules', JSON.stringify(modules));
        setUserModules(modules);
      }

      setIsAuthenticated(true);
      setUserRole(role);
      setUser(userData);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userModules');

      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
      setUserModules(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const updateUser = userData => {
    setUser(userData);
    AsyncStorage.setItem('userData', JSON.stringify(userData)).catch(err =>
      console.error('Error updating user data:', err)
    );
  };

  const updateUserModules = modules => {
    setUserModules(modules);
    AsyncStorage.setItem('userModules', JSON.stringify(modules)).catch(err =>
      console.error('Error updating user modules:', err)
    );
  };

  const value = {
    isAuthenticated,
    userRole,
    user,
    userModules,
    isLoading,
    login,
    logout,
    updateUser,
    updateUserModules,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
