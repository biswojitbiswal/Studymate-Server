"use client";

import { useAuthStore } from "@/store/auth";

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Student Dashboard</h1>
      <p>Welcome, {user?.name ?? user?.email ?? "Student"}.</p>
    </div>
  );
}
