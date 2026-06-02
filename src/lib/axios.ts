import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_CONSTANTS } from "@/services/auth.constants";
import { tokenStorage } from "./tokenStorage";
import { RefreshTokenResponse } from "@/services/auth.types";

// In-memory access token storage
let inMemoryAccessToken: string | null = null;

export const getLocalAccessToken = () => inMemoryAccessToken;
export const setLocalAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

// Create Axios Instance
const api = axios.create({
  baseURL: AUTH_CONSTANTS.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag and queue to manage concurrent token refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach the bearer token if it exists in-memory
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle automatic token refresh on 401s
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // If response is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      // If we are already refreshing, push this request to the queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      const storedRefreshToken = tokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        isRefreshing = false;
        // No refresh token available, clear storage and reject
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = AUTH_CONSTANTS.ROUTES.LOGIN;
        }
        return Promise.reject(error);
      }

      try {
        // Run refresh token request directly using standard axios to avoid recursion
        const refreshResponse = await axios.post<RefreshTokenResponse>(
          `${AUTH_CONSTANTS.API_BASE_URL}auth/refresh-token`,
          { refreshToken: storedRefreshToken }
        );

        if (refreshResponse.data.success && refreshResponse.data.data) {
          const { accessToken, refreshToken, expiration } = refreshResponse.data.data;
          
          // Store new tokens
          setLocalAccessToken(accessToken);
          tokenStorage.setRefreshToken(refreshToken, expiration);
          
          // Update request header and retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          
          // Process all other requests that were queued
          processQueue(null, accessToken);
          isRefreshing = false;
          
          return api(originalRequest);
        } else {
          throw new Error("Refresh token failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Expiry or validation failed, clear credentials and redirect to login
        tokenStorage.clearTokens();
        setLocalAccessToken(null);
        if (typeof window !== "undefined") {
          window.location.href = `${AUTH_CONSTANTS.ROUTES.LOGIN}?session=expired`;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
