'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusDot, type StatusTone } from '@/components/ui/StatusDot'
import { EmptyState } from '@/components/ui/EmptyState'

interface Waiver {
  id: string
  title: string
  description: string | null
  waiver_type: string
  status: string
  issued_by_id: string
  signed_at: string | null
  created_at: string
}

export default function DancerWaiversPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loadingWaivers, setLoadingWaivers] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && !hasFetched.current) {
      hasFetched.current = true
      fetchWaivers()
    }
  }, [loading, user])

  const fetchWaivers = async () => {
    try {
      const response = await fetch('/api/waivers')
      if (response.ok) {
        const data = await response.json()
        setWaivers(data.waivers)
      }
    } catch (error) {
      console.error('Error fetching waivers:', error)
    } finally {
      setLoadingWaivers(false)
    }
  }

  const getStatusTone = (status: string): StatusTone => {
    switch (status) {
      case 'signed':
        return 'positive'
      case 'pending':
        return 'neutral'
      case 'declined':
        return 'attention'
      default:
        return 'neutral'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <p className="text-charcoal-500">Loading...</p>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const pendingWaivers = waivers.filter(w => w.status === 'pending')
  const signedWaivers = waivers.filter(w => w.status === 'signed')

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="My Waivers"
        subtitle="Review and sign waivers for your lessons"
      />

      <div className="mt-header-gap grid gap-6">
        {pendingWaivers.length > 0 && (
          <Card className="bg-gold-50 border border-gold-200">
            <CardTitle>Pending Waivers ({pendingWaivers.length})</CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-3">
                {pendingWaivers.map((waiver) => (
                  <div key={waiver.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-gold-100 rounded-lg border border-gold-200">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-charcoal-950 text-sm md:text-base">{waiver.title}</h3>
                      <p className="text-xs md:text-sm text-charcoal-500 mt-1 line-clamp-2">{waiver.description}</p>
                    </div>
                    <Button
                      onClick={() => router.push(`/dancer/waivers/${waiver.id}/sign`)}
                      className="flex-shrink-0 w-full md:w-auto"
                      size="sm"
                    >
                      Sign Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardTitle>All Waivers ({waivers.length})</CardTitle>
          <CardContent className="mt-4">
            {loadingWaivers ? (
              <p className="text-charcoal-500">Loading waivers...</p>
            ) : waivers.length === 0 ? (
              <EmptyState message="No waivers have been issued to you yet." />
            ) : (
              <>
                {/* Mobile View - Card Layout */}
                <div className="block md:hidden space-y-3">
                  {waivers.map((waiver) => (
                    <div key={waiver.id} className="p-4 bg-champagne-50 rounded-lg border border-champagne-200">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-charcoal-950 text-sm flex-1">{waiver.title}</h3>
                        <StatusDot tone={getStatusTone(waiver.status)} label={waiver.status} />
                      </div>
                      <div className="space-y-1 text-xs text-charcoal-500 mb-3">
                        <div>Issued: {new Date(waiver.created_at).toLocaleDateString()}</div>
                        {waiver.signed_at && <div>Signed: {new Date(waiver.signed_at).toLocaleDateString()}</div>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push(`/dancer/waivers/${waiver.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-champagne-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-charcoal-700">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-charcoal-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-charcoal-700">Issued</th>
                        <th className="text-left py-3 px-4 font-semibold text-charcoal-700">Signed</th>
                        <th className="text-left py-3 px-4 font-semibold text-charcoal-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-champagne-200">
                      {waivers.map((waiver) => (
                        <tr key={waiver.id} className="hover:bg-champagne-100">
                          <td className="py-3 px-4 font-medium text-charcoal-950">{waiver.title}</td>
                          <td className="py-3 px-4">
                            <StatusDot tone={getStatusTone(waiver.status)} label={waiver.status} />
                          </td>
                          <td className="py-3 px-4 text-charcoal-500 text-xs">
                            {new Date(waiver.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-charcoal-500 text-xs">
                            {waiver.signed_at ? new Date(waiver.signed_at).toLocaleDateString() : '–'}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dancer/waivers/${waiver.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
