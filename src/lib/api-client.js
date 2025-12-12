// src/lib/api-client.js
import axios from "axios";
import { BACKEND_URL } from "./endpoints";
import { getAuthToken, storeLogout, setAuthToken } from "@/store/auth";

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // IMPORTANT: allow cookies to be sent/received (refresh cookie)
  withCredentials: true,
});

/* --- Request interceptor: attach Authorization if we have an access token --- */
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* --- Automatic refresh logic for 401 responses --- */

/**
 * We implement a simple queue so multiple requests triggering 401 wait for a
 * single refresh call. When refresh succeeds we retry the queued requests.
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // only attempt refresh for 401 responses and if we haven't already tried refreshing this request
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // mark that this request will be retried to avoid loops
      originalRequest._retry = true;

      if (isRefreshing) {
        // queue request until refresh finishes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // after refresh success, attach new token and retry original request
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        // call refresh endpoint (no body; cookie contains refresh token)
        const refreshRes = await axios.post(
          `${BACKEND_URL}/auth/refresh`,
          {},
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const { accessToken } = refreshRes.data;
        if (!accessToken) throw new Error("No accessToken in refresh response");

        // update token in store so subsequent requests include it
        setAuthToken(accessToken);

        // process queued requests (resolve with token)
        processQueue(null, accessToken);

        // attach new token to original request and retry
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // refresh failed -> logout everywhere
        processQueue(refreshError, null);
        try {
          storeLogout();
        } catch (e) {}
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // other errors or already retried
    return Promise.reject(error);
  }
);

export default api;
