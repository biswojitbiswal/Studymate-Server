"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import LogoutButton from "@/components/auth/LogoutButton";

export default function AdminLayout({ children }) {
  return (
    <RequireAuth role="ADMIN">
      <div className="min-h-screen flex">
        <aside className="w-48 border-r bg-white p-4 text-sm space-y-2">
          <div className="font-semibold mb-4">Admin Dashboard</div>
          <button onClick={() => (window.location.href = "/dashboard/admin")} className="block text-left w-full hover:underline">Home</button>
          <LogoutButton />
        </aside>

        <main className="flex-1 p-4">{children}</main>
      </div>
    </RequireAuth>
  );
}
