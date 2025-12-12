"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

/**
 * RequireAuth:
 * - role: optional string or array of allowed roles ("tutor" | "student" | "admin")
 * - children: page content
 *
 * Behavior:
 * 1. If user exists in store and role matches → render children
 * 2. If user missing → attempt tryRefresh() once
 * 3. If still missing or wrong role → redirect to /signin
 * 4. Shows a simple "Loading..." while checking
 */
export default function RequireAuth({ children, role = null }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tryRefresh = useAuthStore((s) => s.tryRefresh);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      // If user exists, just verify role
      if (user) {
        if (role) {
          const allowed = Array.isArray(role) ? role : [role];
          if (!allowed.includes(user.role)) {
            router.replace("/signin");
            return;
          }
        }
        if (mounted) setChecking(false);
        return;
      }

      // Try refresh once
      const result = await tryRefresh();
      if (result && result.user) {
        // role check
        if (role) {
          const allowed = Array.isArray(role) ? role : [role];
          if (!allowed.includes(result.user.role)) {
            router.replace("/signin");
            return;
          }
        }
        if (mounted) setChecking(false);
        return;
      }

      // cannot rehydrate: redirect to signin
      router.replace("/signin");
    }

    check();
    return () => (mounted = false);
  }, [user, tryRefresh, router, role]);

  if (checking) {
    return <div className="min-h-[200px] flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
