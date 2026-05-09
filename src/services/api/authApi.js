import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './globalApi';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
// import { useAuth } from '../../context/AuthContext';

// Auth API endpoints
const AUTH_ENDPOINTS = {
  ADMIN_LOGIN: '/users/login',
  CLIENT_LOGIN: '/clients/login',
  ADMIN_LOGOUT: '/users/logout',
  CLIENT_LOGOUT: '/clients/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',
  RESET_PASSWORD: '/auth/reset-password',
};

// ================================
// Core Auth API Functions
// ================================
export const authApi = {
  login: async credentials => {
    const endpoint =
      credentials.role === 'member'
        ? AUTH_ENDPOINTS.ADMIN_LOGIN
        : AUTH_ENDPOINTS.CLIENT_LOGIN;

    const payload = {
      email: credentials.email,
      password: credentials.password,
    };

    const response = await apiClient.post(endpoint, payload, {
      skipAuth: true,
    });
    console.log('📩 Login Response:', response);

    let userRole, userIdOrClientId, accessToken;

    // ✅ Admin / Member Login
    if (response?.data?.token?.access_token && response.data.user) {
      accessToken = response.data.token.access_token;
      userRole = response.data.user.role;
      userIdOrClientId = response.data.user.id;

      await AsyncStorage.setItem('authToken', accessToken);
      await AsyncStorage.setItem('userRole', userRole);
      await AsyncStorage.setItem('user_id', userIdOrClientId.toString());

      // Store modules if available
      if (response.data.modules) {
        await AsyncStorage.setItem(
          'userModules',
          JSON.stringify(response.data.modules),
        );
      }
    } else {
      accessToken = response.access_token;
      userRole = 'client';
      // Client data is directly in response.client, not response.data.client
      userIdOrClientId = response.client?.id;

      if (!userIdOrClientId) {
        console.error('❌ Client ID not found in response:', response);
        throw new Error('Client ID not found in login response');
      }

      await AsyncStorage.setItem('authToken', accessToken);
      await AsyncStorage.setItem('userRole', userRole);
      await AsyncStorage.setItem('user_id', userIdOrClientId.toString());
    }

    // ✅ Generate and save FCM token
    try {
      await messaging().registerDeviceForRemoteMessages();
      const fcmToken = await messaging().getToken();
      console.log('🔥 Generated FCM Token:', fcmToken);

      await saveFcmToken(userRole, fcmToken, userIdOrClientId);
      console.log('✅ FCM Token successfully sent to backend.');
    } catch (fcmError) {
      console.error('❌ Failed to generate/send FCM token:', fcmError);
    }

    return credentials.role === 'member' ? response.data : response;
  },

  logout: async () => {
    try {
      // Get user role from local storage
      const role = (await AsyncStorage.getItem('userRole'))?.toLowerCase();

      // Determine endpoint dynamically
      const endpoint =
        role === 'admin' || role === 'superadmin' || role === 'member'
          ? AUTH_ENDPOINTS.ADMIN_LOGOUT
          : AUTH_ENDPOINTS.CLIENT_LOGOUT;

      console.log('🚪 Logging out via:', endpoint);

      await apiClient.post(endpoint);
    } catch (error) {
      console.log('⚠️ Logout API failed, cleaning up locally...', error);
    } finally {
      // Always clear local storage
      await AsyncStorage.multiRemove([
        'authToken',
        'userRole',
        'user_id',
        'userData',
        'userModules',
      ]);
      console.log('🧹 Local session cleared.');
    }
  },

  forgotPassword: async resetData => {
    return await apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, resetData, {
      skipAuth: true,
    });
  },

  verifyOtp: async otpData => {
    return await apiClient.post(AUTH_ENDPOINTS.VERIFY_OTP, otpData);
  },

  resetPassword: async resetData => {
    return await apiClient.post(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      {
        email: resetData.email,
        new_password: resetData.new_password,
      },
      { skipAuth: true },
    );
  },

  getProfile: async () => {
    return await apiClient.get(AUTH_ENDPOINTS.PROFILE);
  },

  refreshToken: async () => {
    const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH_TOKEN);
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
    }
    return response;
  },
};

// ================================
// React Query Hooks
// ================================
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: data => {
      console.log('✅ Login success:', data);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: error => {
      console.error('❌ Login failed:', error);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authApi.logout(); // 👈 dynamically calls correct endpoint
    },
    onSuccess: async () => {
      console.log('✅ Successfully logged out, clearing cache...');
      await queryClient.clear();
    },
    onError: error => {
      console.error('❌ Logout failed:', error);
    },
  });
};
export const useForgotPassword = () =>
  useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: data => console.log('📧 Forgot password email sent:', data),
    onError: error => {
      const msg = error?.response?.data?.detail || 'Something went wrong';
      Alert.alert('Error', msg);
    },
  });

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: data => console.log('✅ OTP verified:', data),
    onError: error => {
      const msg = error?.response?.data?.detail || 'OTP verification failed';
      Alert.alert('Error', msg);
    },
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: data => {
      Alert.alert('Success', 'Your password has been reset.');
      console.log('✅ Password reset:', data);
    },
    onError: error => {
      const msg = error?.response?.data?.detail || 'Password reset failed.';
      Alert.alert('Error', msg);
    },
  });

export const useUserProfile = () =>
  useQuery({
    queryKey: ['user-profile'],
    queryFn: authApi.getProfile,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error) => !error.message.includes('Unauthorized'),
  });

// ================================
// Save FCM Token Function
// ================================
export const saveFcmToken = async (userRole, fcmToken, id) => {
  try {
    // Normalize role safely
    const role =
      typeof userRole === 'string'
        ? userRole.trim().toLowerCase()
        : userRole?.role?.trim?.().toLowerCase?.() || '';

    // ✅ If client → use client API, else → use admin API
    const isClient = role === 'client';

    const endpoint = isClient
      ? '/notifications/client/save-fcm-token'
      : '/notifications/user/save-fcm-token';

    const payload = isClient
      ? { client_id: id, fcm_token: fcmToken }
      : { user_id: id, fcm_token: fcmToken };

    const res = await apiClient.post(endpoint, payload);
    console.log('✅ FCM token saved successfully:', res);
    return res?.data || res;
  } catch (error) {
    console.error('❌ Failed to save FCM token:', error);
    throw error;
  }
};
