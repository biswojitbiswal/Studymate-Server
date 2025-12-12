// src/app/signup/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import RedirectIfAuth from "@/components/auth/RedirectIfAuth";
import RedirectIfAuthClient from "@/components/auth/RedirectIfAuth";

export default function SignUpPage() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup)

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [provider, setProvider] = useState('CREDENTIALS')
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      await signup({ name, phone, email, password, role, provider })

      // Optionally auto signin: For now redirect to signin
      router.push("/signin");
    } catch (error) {
      setErr(error?.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RedirectIfAuthClient redirectToHomeIfAuth={true}>
      {/* <RedirectIfAuth /> */}
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-4">Sign up</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} type="name" placeholder="Enter your name" className="w-full border px-3 py-2 rounded" required />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="phone" placeholder="Enter Phone" className="w-full border px-3 py-2 rounded" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 rounded" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border px-3 py-2 rounded" required />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border px-3 py-2 rounded text-blue-600">
            <option value="STUDENT">Student</option>
            <option value="TUTOR">Tutor</option>
            <option value="ADMIN">Admin</option>
          </select>

          <button className="w-full px-3 py-2 rounded bg-blue-600 text-white">Sign up</button>

          {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
        </form>
      </div>
    </RedirectIfAuthClient>
  );
}
