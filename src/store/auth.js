// src/store/auth.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { API } from "@/lib/endpoint";

/* helpers used by api-client */
export function getAuthToken() {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("studymate_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch (e) {
    return null;
  }
}

export function storeLogout() {
  try {
    const s = useAuthStore.getState();
    if (s?.logout) s.logout();
  } catch (e) {}
}

/* IMPORTANT: helper to let api-client update token after refresh */
export function setAuthToken(token) {
  try {
    useAuthStore.setState({ token });
  } catch (e) {}
}

/**
 * NOTE: we use `user: undefined` as initial value -> means "not loaded yet".
 * When rehydrate finishes, the persisted value will overwrite this. If no
 * persisted user exists, we will set user = null after a failed refresh.
 */

// module-level variable to dedupe in-flight refresh
let _refreshPromise = null;

export const useAuthStore = create(
  persist(
    (set, get) => {
      return {
        user: undefined, // undefined = not checked yet, null = known not logged-in, object = logged in
        token: null,

        login: async (email, password, role) => {
          const res = await fetch(API.AUTH_SIGNIN, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password, role }),
          });

          const data = await res.json();
          if (!res.ok) {
            const message = data?.message || data?.error || "Signin failed";
            const err = new Error(message);
            err.status = res.status;
            throw err;
          }

          const token = data.data?.accessToken ?? data.token;
          const user = data.data?.user ?? null;
          if (!token || !user) throw new Error("Invalid signin response");

          set({ user, token });
          return { user, token };
        },

        signup: async (payload) => {
          const res = await fetch(API.AUTH_SIGNUP, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) {
            const message = data?.message || data?.error || "Signup failed";
            const err = new Error(message);
            err.status = res.status;
            throw err;
          }
          return data;
        },

        // deduped tryRefresh
        tryRefresh: async () => {
          // if user already exists, short-circuit
          const current = get().user;
          if (current) return { user: current };

          // if refresh already running, return same promise
          if (_refreshPromise) return _refreshPromise;

          _refreshPromise = (async () => {
            try {
              const res = await fetch(API.AUTH_REFRESH, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              });

              if (!res.ok) {
                // cannot refresh -> mark as known "no user"
                set({ user: null, token: null });
                return null;
              }

              const data = await res.json();
              // support both shapes: { accessToken, user } or nested data
              const token = data?.accessToken ?? data?.token ?? data?.data?.accessToken;
              const user = data?.user ?? data?.data?.user ?? null;

              if (!token || !user) {
                set({ user: null, token: null });
                return null;
              }

              set({ user, token });
              return { user, token };
            } catch (e) {
              set({ user: null, token: null });
              return null;
            } finally {
              // clear so next attempt can run later
              _refreshPromise = null;
            }
          })();

          return _refreshPromise;
        },

        logout: () => {
          set({ user: null, token: null });
        },
      };
    },
    {
      name: "studymate_auth",
      getStorage: () => (typeof window !== "undefined" ? localStorage : null),
    }
  )
);
