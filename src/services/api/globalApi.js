import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '@env';
import { showToast } from '../../utils/toast';
const BASE_URL = 'https://5306-182-181-158-7.ngrok-free.app/api/v1'; // your API URL
// const BASE_URL = 'https://api.vendixs.com/api/v1'; // your API URL
class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.onUnauthorized = null; // Callback for 401 errors
  }

  setOnUnauthorized(callback) {
    this.onUnauthorized = callback;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const { skipAuth = false, responseType, ...restOptions } = options;
    console.log(url, "urlurl");
    
    const defaultHeaders = { 'Content-Type': 'application/json' };

    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...restOptions,
      headers: {
        ...defaultHeaders,
        ...(restOptions.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized - clear token and trigger logout
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userData');
          await AsyncStorage.removeItem('userModules');

          // Call the logout callback if it exists
          if (this.onUnauthorized) {
            this.onUnauthorized();
          }

          throw new Error('Unauthorized');
        }
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          if (errorData.detail) {
            errorMessage =
              typeof errorData.detail === 'string'
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          } else if (errorData.message) {
            errorMessage =
              typeof errorData.message === 'string'
                ? errorData.message
                : JSON.stringify(errorData.message);
          } else if (errorData.error) {
            errorMessage =
              typeof errorData.error === 'string'
                ? errorData.error
                : JSON.stringify(errorData.error);
          }
        } catch (e) {
          console.log('Failed to parse error response:', e);
        }
        // Don't toast 401 — handled above with logout
        if (response.status !== 401) {
          showToast.error(errorMessage);
        }
        throw errorMessage;
      }

      const contentType = response.headers.get('content-type') || '';

      //  Handle binary (PDF, etc.)
      if (
        responseType === 'arraybuffer' ||
        contentType.includes('application/pdf')
      ) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          data: arrayBuffer,
          headers: { 'content-type': contentType },
        };
      }

      //  Handle JSON safely
      if (contentType.includes('application/json')) {
        const data = await response.json();
        // Show backend success message for mutating requests
        const method = (config.method ?? '').toUpperCase();
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && data?.message) {
          showToast.success(data.message);
        }
        return data;
      }

      //  Fallback to text
      const textData = await response.text();
      return textData;
    } catch (error) {
      // 401 is already handled above (onUnauthorized + clear storage) — don't log it again
      if (error?.message !== 'Unauthorized') {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

export default new ApiClient();
export { BASE_URL };