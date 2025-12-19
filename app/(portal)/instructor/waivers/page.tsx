'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PlusIcon } from '@heroicons/react/24/outline'
import { CreateWaiverTemplateDialog } from '@/components/CreateWaiverTemplateDialog'
import { IssueWaiverDialog } from '@/components/IssueWaiverDialog'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  content_type: 'rich_text' | 'pdf'
  content: string | null
  waiver_type: string
  is_shared: boolean
  created_at: string
}

interface IssuedWaiver {
  id: string
  title: string
  waiver_type: string
  status: string
  created_at: string
}

export default function InstructorWaiversPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [templates, setTemplates] = useState<WaiverTemplate[]>([])
  const [issuedWaivers, setIssuedWaivers] = useState<IssuedWaiver[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [loadingWaivers, setLoadingWaivers] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WaiverTemplate | null>(null)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user) {
      fetchTemplates()
      fetchIssuedWaivers()
    }
  }, [loading, user?.id])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/waiver-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchIssuedWaivers = async () => {
    try {
      const response = await fetch('/api/waivers')
      if (response.ok) {
        const data = await response.json()
        setIssuedWaivers(data.waivers)
      }
    } catch (error) {
      console.error('Error fetching waivers:', error)
    } finally {
      setLoadingWaivers(false)
    }
  }

  const handleIssueWaiver = (template: WaiverTemplate) => {
    setSelectedTemplate(template)
    setShowIssueDialog(true)
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

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Waiver Management</h1>
        <p className="text-gray-600">Create templates and issue waivers to students or studios</p>
      </div>

      <div className="grid gap-6">
        {/* Templates Section */}
        <Card>
          <CardTitle>Waiver Templates ({templates.length})</CardTitle>
          <CardContent className="mt-4">
            <div className="mb-4 flex gap-3">
              <Button onClick={() => setShowCreateDialog(true)} aria-label="Create Template">
                <PlusIcon className="w-5 h-5" />
              </Button>
              <Button variant="outline">
                📄 Upload PDF Template
              </Button>
            </div>

            {loadingTemplates ? (
              <p className="text-gray-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">No templates yet</p>
                <p className="text-sm text-gray-400">
                  Create a template to get started with issuing waivers
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{template.title}</h3>
                      {template.content_type === 'pdf' && (
                        <Badge variant="default">PDF</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default">{template.waiver_type}</Badge>
                      {template.is_shared && (
                        <Badge variant="default">Shared</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleIssueWaiver(template)}
                        className="flex-1"
                      >
                        Issue Waiver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/instructor/waivers/templates/${template.id}`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issued Waivers Section */}
        <Card>
          <CardTitle>Issued Waivers ({issuedWaivers.length})</CardTitle>
          <CardContent className="mt-4">
            {loadingWaivers ? (
              <p className="text-gray-500">Loading waivers...</p>
            ) : issuedWaivers.length === 0 ? (
              <p className="text-gray-500">No waivers issued yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Issued</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {issuedWaivers.map((waiver) => (
                      <tr key={waiver.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{waiver.title}</td>
                        <td className="py-3 px-4 text-gray-600 capitalize">{waiver.waiver_type}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusColor(waiver.status)}>
                            {waiver.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {new Date(waiver.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/instructor/waivers/${waiver.id}`)}
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

      {/* Dialogs */}
      <CreateWaiverTemplateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          fetchTemplates()
        }}
      />

      {selectedTemplate && (
        <IssueWaiverDialog
          isOpen={showIssueDialog}
          onClose={() => {
            setShowIssueDialog(false)
            setSelectedTemplate(null)
          }}
          template={selectedTemplate}
          onSuccess={() => {
            fetchIssuedWaivers()
          }}
        />
      )}
    </PortalLayout>
  )
}
