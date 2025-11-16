'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export default function StudioPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio_admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'studio_admin') {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Studio Portal
        </h1>
        <p className="text-gray-600">Welcome back, {profile.full_name}!</p>
      </div>
      
      <Card>
        <CardTitle>Dashboard</CardTitle>
        <CardContent className="mt-4">
          <p className="text-gray-600">
            Manage studio operations and oversight
          </p>
        </CardContent>
      </Card>
    </PortalLayout>
  )
}
