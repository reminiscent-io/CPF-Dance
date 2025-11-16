export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-mauve-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Welcome Back
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in to your account
        </p>
        <div className="text-center text-sm text-gray-500">
          Login form will be implemented with Supabase Auth
        </div>
      </div>
    </div>
  )
}
