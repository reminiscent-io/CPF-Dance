'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const portalConfig = {
  dancer: {
    title: 'Dancer Login',
    subtitle: 'Access your dance journey',
    icon: '💃',
    gradient: 'from-rose-50 to-pink-50',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
    ringColor: 'focus:ring-rose-500',
    textColor: 'text-rose-600',
  },
  instructor: {
    title: 'Instructor Login',
    subtitle: 'Manage your students and classes',
    icon: '👩‍🏫',
    gradient: 'from-mauve-50 to-purple-50',
    buttonColor: 'bg-mauve-600 hover:bg-mauve-700',
    ringColor: 'focus:ring-mauve-500',
    textColor: 'text-mauve-600',
  },
  studio: {
    title: 'Studio Login',
    subtitle: 'Oversee your studio operations',
    icon: '🏢',
    gradient: 'from-gray-50 to-slate-50',
    buttonColor: 'bg-gray-700 hover:bg-gray-800',
    ringColor: 'focus:ring-gray-500',
    textColor: 'text-gray-700',
  },
}

function LoginForm() {
  const searchParams = useSearchParams()
  const portal = (searchParams.get('portal') || 'dancer') as keyof typeof portalConfig
  const config = portalConfig[portal] || portalConfig.dancer

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          portal,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || 'An unexpected error occurred')
        setLoading(false)
        return
      }

      if (result.success && result.redirectUrl) {
        // Force a full page navigation to ensure cookies are read
        window.location.href = result.redirectUrl
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} px-4`}>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          {config.title}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {config.subtitle}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${config.buttonColor} text-white py-3 rounded-md transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href={`/signup?portal=${portal}`}
              className={`${config.textColor} hover:underline font-medium`}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
