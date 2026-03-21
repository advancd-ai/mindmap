/**
 * API client
 */

import axios from 'axios';
import { useAuthStore } from '../store/auth';
import { getBackendBaseUrl } from '../config/runtime';

const baseURL = getBackendBaseUrl();

// Flag to prevent multiple redirects
let isRedirecting = false;

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  // Prevent requests if we're already redirecting
  if (isRedirecting) {
    const cancelError = new Error('Redirecting to login');
    cancelError.name = 'CanceledError';
    return Promise.reject(cancelError);
  }
  
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    try {
      const { token } = JSON.parse(auth).state;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Invalid auth storage, ignore
    }
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Prevent multiple redirects
      if (isRedirecting) {
        return Promise.reject(error);
      }
      
      isRedirecting = true;
      
      // Clear auth storage
      try {
        const { logout } = useAuthStore.getState();
        logout();
        localStorage.removeItem('auth-storage');
      } catch (e) {
        console.error('Error clearing auth:', e);
      }
      
      // Cancel any pending requests
      // Redirect to login after a short delay to allow cleanup
      setTimeout(() => {
        window.location.assign('/login');
      }, 100);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

