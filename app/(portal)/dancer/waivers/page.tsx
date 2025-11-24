'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'declined':
        return 'danger'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Waivers</h1>
        <p className="text-gray-600">Review and sign waivers for your lessons</p>
      </div>

      <div className="grid gap-6">
        {pendingWaivers.length > 0 && (
          <Card className="border-l-4 border-l-yellow-400">
            <CardTitle>Pending Waivers ({pendingWaivers.length})</CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-3">
                {pendingWaivers.map((waiver) => (
                  <div key={waiver.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <h3 className="font-semibold text-gray-900">{waiver.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{waiver.description}</p>
                    </div>
                    <Button
                      onClick={() => router.push(`/dancer/waivers/${waiver.id}/sign`)}
                      className="flex-shrink-0 ml-4"
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
              <p className="text-gray-500">Loading waivers...</p>
            ) : waivers.length === 0 ? (
              <p className="text-gray-500">No waivers yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Issued</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Signed</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {waivers.map((waiver) => (
                      <tr key={waiver.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{waiver.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusColor(waiver.status)}>
                            {waiver.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {new Date(waiver.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {waiver.signed_at ? new Date(waiver.signed_at).toLocaleDateString() : '—'}
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
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
