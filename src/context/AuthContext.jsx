import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api/globalApi';

let firebaseAuth = null;
try { firebaseAuth = require('@react-native-firebase/auth').default; } catch { firebaseAuth = null; }

// Sign into Firebase with a custom token (after login) or anonymously (on logout/startup).
// This makes request.auth non-null in Firestore Security Rules.
async function syncFirebaseAuth(firebaseToken) {
  if (!firebaseAuth) return;
  try {
    if (firebaseToken) {
      await firebaseAuth().signInWithCustomToken(firebaseToken);
    } else {
      await firebaseAuth().signInAnonymously();
    }
  } catch { /* non-fatal — chat will degrade gracefully */ }
}

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
  const appState = useRef(AppState.currentState);

  useEffect(() => { checkAuthStatus(); }, []);

  useEffect(() => {
    apiClient.setOnUnauthorized(() => logout());
  }, []);

  // Re-fetch permissions when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshPermissions();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
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

  // Silently merge fresh permissionCodes from the profile endpoint
  const refreshPermissions = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await apiClient.get('/user/profile');
      const profile = res?.data ?? res;
      if (!profile) return;
      const storedRaw = await AsyncStorage.getItem('userData');
      if (!storedRaw) return;
      const stored = JSON.parse(storedRaw);
      const merged = {
        ...stored,
        permissionCodes: profile.permissionCodes ?? stored.permissionCodes,
        businessPermissionCodes: profile.businessPermissionCodes ?? stored.businessPermissionCodes,
      };
      setUser(merged);
      await AsyncStorage.setItem('userData', JSON.stringify(merged));
    } catch {
      // Silent — token may be expired (handled by onUnauthorized)
    }
  };

  const login = async (userData, token, firebaseToken) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setUser(userData);
      await syncFirebaseAuth(firebaseToken);
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
      await syncFirebaseAuth(); // fall back to anonymous so Firestore rules still pass
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
    <AuthContext.Provider value={{
      isAuthenticated, userRole, user, isLoading,
      login, logout, updateUser, checkAuthStatus, refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
