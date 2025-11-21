'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { UserRole } from '@/lib/auth/types'

const portalConfig = {
  dancer: {
    title: 'Dancer Signup',
    subtitle: 'Start your dance journey today',
    icon: '💃',
    gradient: 'from-rose-50 to-pink-50',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
    ringColor: 'focus:ring-rose-500',
    textColor: 'text-rose-600',
    defaultRole: 'dancer' as UserRole,
  },
  instructor: {
    title: 'Instructor Signup',
    subtitle: 'Join our teaching community',
    icon: '👩‍🏫',
    gradient: 'from-mauve-50 to-purple-50',
    buttonColor: 'bg-mauve-600 hover:bg-mauve-700',
    ringColor: 'focus:ring-mauve-500',
    textColor: 'text-mauve-600',
    defaultRole: 'instructor' as UserRole,
  },
  studio: {
    title: 'Studio Signup',
    subtitle: 'Manage your studio with ease',
    icon: '🏢',
    gradient: 'from-gray-50 to-slate-50',
    buttonColor: 'bg-gray-700 hover:bg-gray-800',
    ringColor: 'focus:ring-gray-500',
    textColor: 'text-gray-700',
    defaultRole: 'studio' as UserRole,
  },
}

export default function SignupPage() {
  const searchParams = useSearchParams()
  const portal = (searchParams.get('portal') || 'dancer') as keyof typeof portalConfig
  const config = portalConfig[portal] || portalConfig.dancer

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: config.defaultRole,
    isAtLeast13: true,
    guardianEmail: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGuardianField, setShowGuardianField] = useState(false)

  // Update role when portal changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, role: config.defaultRole }))
  }, [portal, config.defaultRole])

  function handleAgeConfirmationChange(isAtLeast13: boolean) {
    setFormData({ ...formData, isAtLeast13 })

    if (formData.role === 'dancer') {
      setShowGuardianField(!isAtLeast13)
      if (isAtLeast13) {
        setFormData(prev => ({ ...prev, guardianEmail: '' }))
      }
    }
  }

  function handleRoleChange(role: UserRole) {
    setFormData({ ...formData, role })

    if (role !== 'dancer') {
      setShowGuardianField(false)
      setFormData(prev => ({ ...prev, guardianEmail: '', isAtLeast13: true }))
    } else {
      setShowGuardianField(!formData.isAtLeast13)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (showGuardianField && !formData.guardianEmail) {
      setError('Guardian email is required for dancers under 13')
      return
    }

    if (showGuardianField && formData.guardianEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.guardianEmail.trim())) {
        setError('Please enter a valid guardian email address')
        return
      }
    }

    setLoading(true)

    const signUpData = {
      email: formData.email.trim(),
      password: formData.password,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim() || undefined,
      role: formData.role,
      isAtLeast13: formData.isAtLeast13,
      guardianEmail: formData.guardianEmail.trim() || undefined,
      portal,
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpData),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || 'An unexpected error occurred')
        setLoading(false)
        return
      }

      if (result.success && result.redirectUrl) {
        // Longer delay to ensure cookies are fully set in Replit environment
        await new Promise(resolve => setTimeout(resolve, 1000))
        window.location.replace(result.redirectUrl)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} px-4 py-8`}>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          {config.title}
        </h1>
        <p className="text-center text-gray-600 mb-6">
          {config.subtitle}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="Jane Smith"
              disabled={loading}
            />
          </div>

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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              I am a...
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              required
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              disabled={loading}
            >
              <option value="dancer">Dancer</option>
              <option value="instructor">Instructor</option>
              <option value="studio">Studio Admin</option>
              <option value="admin">Admin (Development)</option>
            </select>
          </div>

          {formData.role === 'dancer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Are you at least 13 years old?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="ageConfirmation"
                    value="yes"
                    checked={formData.isAtLeast13}
                    onChange={() => handleAgeConfirmationChange(true)}
                    disabled={loading}
                    className="mr-2 w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-gray-700">Yes</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="ageConfirmation"
                    value="no"
                    checked={!formData.isAtLeast13}
                    onChange={() => handleAgeConfirmationChange(false)}
                    disabled={loading}
                    className="mr-2 w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-gray-700">No</span>
                </label>
              </div>
            </div>
          )}

          {showGuardianField && (
            <div className="bg-mauve-50 p-4 rounded-md border border-mauve-200">
              <label
                htmlFor="guardianEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Guardian Email
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Since you are under 13, we need your guardian&apos;s email. A guardian account will be created and they&apos;ll receive a notification to provide consent.
              </p>
              <input
                id="guardianEmail"
                type="email"
                value={formData.guardianEmail}
                onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                required
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
                placeholder="guardian@example.com"
                disabled={loading}
              />
            </div>
          )}

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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 ${config.ringColor} focus:border-transparent transition`}
              placeholder="••••••••"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href={`/login?portal=${portal}`}
              className={`${config.textColor} hover:underline font-medium`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
