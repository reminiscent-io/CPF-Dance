'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UserRole } from '@/lib/auth/types'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'dancer' as UserRole,
    dateOfBirth: '',
    guardianEmail: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGuardianField, setShowGuardianField] = useState(false)

  function calculateAge(birthDate: string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  function handleDateOfBirthChange(dateOfBirth: string) {
    setFormData({ ...formData, dateOfBirth })
    
    if (dateOfBirth && formData.role === 'dancer') {
      const age = calculateAge(dateOfBirth)
      setShowGuardianField(age < 13)
    } else {
      setShowGuardianField(false)
    }
  }

  function handleRoleChange(role: UserRole) {
    setFormData({ ...formData, role })
    
    if (role !== 'dancer') {
      setShowGuardianField(false)
    } else if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      setShowGuardianField(age < 13)
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

    setLoading(true)

    const signUpData = {
      email: formData.email.trim(),
      password: formData.password,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim() || undefined,
      role: formData.role,
      dateOfBirth: formData.dateOfBirth || undefined,
      guardianEmail: formData.guardianEmail.trim() || undefined,
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
        window.location.href = result.redirectUrl
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-mauve-50 px-4 py-8">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Get Started
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Create your account
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              disabled={loading}
            >
              <option value="dancer">Dancer</option>
              <option value="instructor">Instructor</option>
              <option value="studio_admin">Studio Admin</option>
            </select>
          </div>

          {formData.role === 'dancer' && (
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                disabled={loading}
              />
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
              <p className="text-xs text-gray-600 mb-2">
                Since you are under 13, we need your guardian's email for consent
              </p>
              <input
                id="guardianEmail"
                type="email"
                value={formData.guardianEmail}
                onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 text-white py-3 rounded-md hover:bg-rose-700 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
