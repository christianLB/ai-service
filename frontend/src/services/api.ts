import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';

// Configure axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests
});

// CSRF token management
let csrfToken: string | null = null;

// Function to fetch CSRF token
const fetchCSRFToken = async (): Promise<string> => {
  try {
    const response = await axios.get(`${api.defaults.baseURL}/csrf-token`, {
      withCredentials: true,
    });
    const token = response.data.csrfToken;
    if (!token) {
      throw new Error('No CSRF token received');
    }
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

// Function to get CSRF token from cookie
const getCSRFTokenFromCookie = (): string | null => {
  const name = 'x-csrf-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
};

// Token refresh logic
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error | AxiosError) => void;
}> = [];

const processQueue = (error: Error | AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add auth token if needed
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
      // Skip CSRF for auth endpoints as they're excluded in backend
      if (!config.url?.includes('/auth/')) {
        // First try to get token from cookie
        let token = getCSRFTokenFromCookie();
        
        // If not in cookie or expired, fetch new token
        if (!token) {
          try {
            token = await fetchCSRFToken();
          } catch (error) {
            console.error('Failed to get CSRF token:', error);
            // Continue without CSRF token - let backend handle the error
          }
        }
        
        if (token) {
          config.headers['x-csrf-token'] = token;
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with auto-refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };

    // Handle CSRF token errors
    if (error.response?.status === 403 && 
        error.response?.data && 
        typeof error.response.data === 'object' &&
        'code' in error.response.data &&
        error.response.data.code === 'CSRF_VALIDATION_FAILED' &&
        !originalRequest._csrfRetry) {
      
      originalRequest._csrfRetry = true;
      
      try {
        // Fetch new CSRF token
        await fetchCSRFToken();
        
        // Retry the request with new token
        if (csrfToken && originalRequest.headers) {
          originalRequest.headers['x-csrf-token'] = csrfToken;
        }
        
        return api(originalRequest);
      } catch (csrfError) {
        console.error('Failed to refresh CSRF token:', csrfError);
        return Promise.reject(error);
      }
    }

    // Handle 401 errors (unauthorized)
    // Don't intercept auth endpoints - let them handle their own errors
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Save new tokens
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        
        // Update authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
        
        // Process queued requests
        processQueue(null, accessToken);
        
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        processQueue(refreshError instanceof Error ? refreshError : new Error('Token refresh failed'), null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };