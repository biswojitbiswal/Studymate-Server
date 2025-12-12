"use client";

import { useAuthStore } from "@/store/auth";

export default function TutorDashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Tutor Dashboard</h1>
      <p>Welcome, {user?.name ?? user?.email ?? "Tutor"}.</p>
    </div>
  );
}
