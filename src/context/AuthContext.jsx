import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api/globalApi';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { checkAuthStatus(); }, []);

  useEffect(() => {
    apiClient.setOnUnauthorized(() => logout());
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');
      if (token && storedUser) {
        const parsed = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserRole(parsed.role ?? null);
        setUser(parsed);
      }
    } catch (e) {
      console.error('checkAuthStatus error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // userData: PosAuthUser shape { id, name, email, role, businessName, businessType, permissionCodes, isTrialExpired, trialEndsAt }
  const login = async (userData, token) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setUser(userData);
    } catch (e) {
      console.error('login error:', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
    } catch (e) {
      console.error('logout error:', e);
    }
  };

  const updateUser = updated => {
    const merged = { ...user, ...updated };
    setUser(merged);
    AsyncStorage.setItem('userData', JSON.stringify(merged)).catch(console.error);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, user, isLoading, login, logout, updateUser, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
