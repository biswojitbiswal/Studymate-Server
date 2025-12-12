"use client";

import LogoutButton from "@/components/auth/LogoutButton";
import { useAuthStore } from "@/store/auth";

export default function NavAuthActions() {
  const user = useAuthStore((s) => s.user);

  // Compute dashboard URL using role
  const dashboardUrl =
    user?.role === "TUTOR"
      ? "/dashboard/tutor"
      : user?.role === "STUDENT"
      ? "/dashboard/student"
      : user?.role === "ADMIN"
      ? "/dashboard/admin"
      : "/dashboard"; // fallback

  // If logged in → show Logout + Dashboard Link
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-blue-600 text-sm">
          Hi, {user.name || user.email}
        </span>

        <a
          href={dashboardUrl}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          Dashboard
        </a>

        <LogoutButton />
      </div>
    );
  }

  // If NOT logged in → show Sign in / Sign up
  return (
    <nav className="flex items-center gap-4 text-sm">
      <a href="/signin" className="hover:underline text-blue-600">
        Sign in
      </a>
      <a href="/signup" className="hover:underline text-blue-600">
        Sign up
      </a>
    </nav>
  );
}
