"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import LogoutButton from "@/components/auth/LogoutButton";

export default function StudentLayout({ children }) {
  return (
    <RequireAuth role="STUDENT">
      <div className="min-h-screen flex">
        <aside className="w-48 border-r bg-white p-4 text-sm space-y-2">
          <div className="font-semibold mb-4">Student Dashboard</div>
          <button onClick={() => (window.location.href = "/dashboard/student")} className="block text-left w-full hover:underline">Home</button>
          <LogoutButton />
        </aside>

        <main className="flex-1 p-4">{children}</main>
      </div>
    </RequireAuth>
  );
}
