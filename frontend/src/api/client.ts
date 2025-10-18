/**
 * API client
 */

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const { token } = JSON.parse(auth).state;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login using assign() to avoid TrustedScriptURL error
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

