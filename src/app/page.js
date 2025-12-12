export default function HomePage() {
  
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold tracking-tight">StudyMate</h1>
      <p className="text-gray-600 mt-3 text-center max-w-md">
        Tutor & student productivity platform built with Next.js and JavaScript.
      </p>

      
        <a
          href="/signup"
          className="mt-6 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          Create an account
        </a>

    </main>
  );
}
