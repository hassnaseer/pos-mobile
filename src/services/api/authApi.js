import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import apiClient from './globalApi';

// POS backend paths (controller prefix: /user, global prefix: /api/v1)
const AUTH = {
  LOGIN: '/user/login',
  VERIFY_OTP: '/user/verify-otp',
  RESEND_CODE: '/user/resendCode',
  FORGOT_PASSWORD: '/user/forgot-password',
  VERIFY_FORGOT: '/user/verify/forgot-pwd',
  RESET_PASSWORD: '/user/reset-password',
  FCM_TOKEN: '/user/fcm-token',
  LOGOUT: '/user/logout',
};

const getFcmToken = async () => {
  try {
    await messaging().registerDeviceForRemoteMessages();
    return await messaging().getToken();
  } catch {
    return null;
  }
};

export const authApi = {
  // Step 1: POST /user/login → { data: { message, email, devOtp? } }
  login: async ({ email, password }) => {
    const res = await apiClient.post(AUTH.LOGIN, { email, password }, { skipAuth: true });
    // res.data contains { message, email, devOtp? }
    return res?.data ?? res;
  },

  // Step 2: POST /user/verify-otp → { data: { user, access_token } }
  verifyOtp: async ({ email, otp, flow = 'login' }) => {
    let fcmToken = null;
    if (flow === 'login') {
      fcmToken = await getFcmToken();
    }
    const body = { email, otp, flow, ...(fcmToken ? { fcmToken } : {}) };
    const res = await apiClient.post(AUTH.VERIFY_OTP, body, { skipAuth: true });
    return res?.data ?? res;
  },

  resendCode: async ({ email, flow = 'login' }) => {
    const res = await apiClient.post(AUTH.RESEND_CODE, { email, flow }, { skipAuth: true });
    return res?.data ?? res;
  },

  forgotPassword: async ({ email }) => {
    const res = await apiClient.post(AUTH.FORGOT_PASSWORD, { email }, { skipAuth: true });
    return res?.data ?? res;
  },

  verifyForgotOtp: async ({ email, otp }) => {
    const res = await apiClient.post(AUTH.VERIFY_OTP, { email, otp, flow: 'forgot-password' }, { skipAuth: true });
    return res?.data ?? res;
  },

  resetPassword: async ({ email, newPassword }) => {
    const res = await apiClient.post(AUTH.RESET_PASSWORD, { email, newPassword }, { skipAuth: true });
    return res?.data ?? res;
  },

  saveFcmToken: async token => {
    const res = await apiClient.post(AUTH.FCM_TOKEN, { token });
    return res?.data ?? res;
  },

  logout: async () => {
    try {
      await apiClient.post(AUTH.LOGOUT);
    } catch {/* non-critical */}
    await AsyncStorage.multiRemove(['authToken', 'userData']);
  },
};

// ─── React Query hooks ───────────────────────────────────────────────────────

export const useLoginMutation = () =>
  useMutation({ mutationFn: authApi.login });

export const useVerifyOtpMutation = () =>
  useMutation({ mutationFn: authApi.verifyOtp });

export const useResendCodeMutation = () =>
  useMutation({ mutationFn: authApi.resendCode });

export const useForgotPasswordMutation = () =>
  useMutation({
    mutationFn: authApi.forgotPassword,
    onError: err => Alert.alert('Error', typeof err === 'string' ? err : 'Something went wrong'),
  });

export const useVerifyForgotOtpMutation = () =>
  useMutation({ mutationFn: authApi.verifyForgotOtp });

export const useResetPasswordMutation = () =>
  useMutation({ mutationFn: authApi.resetPassword });

export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => qc.clear(),
  });
};
