"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import LogoutButton from "@/components/auth/LogoutButton";
import { useRouter } from "next/navigation";

export default function TutorLayout({ children }) {
  return (
    <RequireAuth role="TUTOR">
      <div className="min-h-screen flex">
        <aside className="w-48 border-r bg-white p-4 text-sm space-y-2">
          <div className="font-semibold mb-4">Tutor Dashboard</div>
          <button onClick={() => (window.location.href = "/dashboard/tutor")} className="block text-left w-full hover:underline">Home</button>
          <LogoutButton />
        </aside>

        <main className="flex-1 p-4">{children}</main>
      </div>
    </RequireAuth>
  );
}
