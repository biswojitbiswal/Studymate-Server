// src/app/layout.js
import "./globals.css";
import NavAuthActions from "@/components/auth/NavAuthActions";

export const metadata = {
  title: "StudyMate",
  description: "Study & tuition management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
          <header className="h-14 border-b bg-white flex items-center justify-between px-6">
            <a href="/" className="font-bold text-blue-600">StudyMate</a>

            <div className="flex items-center gap-3">
              <NavAuthActions />
            </div>
          </header>

          <main className="p-6 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
