"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LogoutButton() {
    const router = useRouter();
    const logout = useAuthStore((s) => s.logout);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4040/api/v1'

    async function doLogout() {
        try {
            await fetch(`${BACKEND_URL}/auth/signout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (e) { }

        logout();
        router.push("/");
    }

    return (
        <button onClick={doLogout} className="text-lg text-blue-600">
            Logout
        </button>
    );
}
