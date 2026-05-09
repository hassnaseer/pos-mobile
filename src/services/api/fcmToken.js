import apiClient from './globalApi';

/**
 * Save the Firebase Cloud Messaging token for either a client or an admin.
 * Automatically selects the correct endpoint based on userRole.
 *
 * @param {string} userRole  - 'admin' | 'superadmin' | 'client' | 'member'
 * @param {string} fcmToken  - The device's FCM token
 * @param {number|string} id - user_id or client_id from login response
 */
export const saveFcmToken = async (userRole, fcmToken, id) => {
  try {
    // Normalize role
    const role =
      typeof userRole === 'string'
        ? userRole.trim().toLowerCase()
        : userRole?.role?.trim?.().toLowerCase?.() || 'client';

    // Choose endpoint & payload
    const { endpoint, payload } =
      role === 'admin' || role === 'superadmin' || role === 'member'
        ? {
            endpoint: '/notifications/user/save-fcm-token',
            payload: { user_id: id, fcm_token: fcmToken },
          }
        : {
            endpoint: '/notifications/client/save-fcm-token',
            payload: { client_id: id, fcm_token: fcmToken },
          };


    // Send to backend
    const res = await apiClient.post(endpoint, payload);
    console.log('FCM token saved successfully:', res);
    return res?.data;
  } catch (error) {
    console.error('Failed to save FCM token:', error);
    throw error;
  }
};
