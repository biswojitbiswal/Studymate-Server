// src/app/signin/page.js  (SERVER component — no "use client")
import SignInForm from "@/components/auth/SigninForm";
import RedirectIfAuthClient from "@/components/auth/RedirectIfAuth";

export default function SignInPage() {

  return (
    <RedirectIfAuthClient redirectToHomeIfAuth={true}>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow-sm">
        <h1 className="text-lg font-semibold mb-4 text-blue-600">Sign in</h1>

        {/* Client-side form renders here and handles user input */}

        <SignInForm />


      </div>
    </RedirectIfAuthClient>
  );
}
