export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-mauve-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Dance Schedule Management
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Professional scheduling for dance instructors and studios
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
          >
            Login
          </a>
          <a
            href="/signup"
            className="px-6 py-3 border border-rose-600 text-rose-600 rounded-lg hover:bg-rose-50 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}
