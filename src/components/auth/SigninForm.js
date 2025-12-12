// src/components/auth/SignInForm.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function SignInForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const { user } = await login(email, password, role);

      if (user?.role === "TUTOR") router.push("/dashboard/tutor");
      else if (user?.role === "STUDENT") router.push("/dashboard/student");
      else if (user?.role === "ADMIN") router.push("/dashboard/admin");
      else router.push("/");
    } catch (err) {
      console.error(err);
      setErr(err?.message ?? "Signin failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        className="w-full border px-3 py-2 rounded border-blue-600 text-black"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
      />

      <input
        className="w-full border px-3 py-2 rounded border-blue-600 text-black"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
      />

      <select
        className="w-full border px-3 py-2 rounded border-blue-600 text-black"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="STUDENT">Student</option>
        <option value="TUTOR">Tutor</option>
        <option value="ADMIN">Admin</option>
      </select>

      <button
        type="submit"
        className="w-full py-2 rounded bg-blue-600 text-white"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
    </form>
  );
}
