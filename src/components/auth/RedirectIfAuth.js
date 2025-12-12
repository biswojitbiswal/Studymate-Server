"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import LoadingScreen from "@/components/common/LoadingScreen";

/**
 * Props:
 * - redirectToHomeIfAuth: if true -> logged in user goes to "/"
 *   (for signin & signup pages)
 */
export default function RedirectIfAuthClient({
  children,
  redirectToHomeIfAuth = false,
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const state = useAuthStore.getState();

    function doRedirect(u) {
      if (redirectToHomeIfAuth) {
        router.replace("/");
        return;
      }

      // default behavior = go to correct dashboard
      if (u.role === "TUTOR") router.replace("/dashboard/tutor");
      else if (u.role === "ADMIN") router.replace("/dashboard/admin");
      else router.replace("/dashboard/student");
    }

    if (state.user !== undefined) {
      if (state.user) doRedirect(state.user);
      else setReady(true);
      return;
    }

    const unsub = useAuthStore.subscribe(
      (s) => {
        if (s.user) {
          doRedirect(s.user);
        } else {
          setReady(true);
        }
      },
      (s) => s.user
    );

    return () => unsub();
  }, [router, redirectToHomeIfAuth]);

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
}
