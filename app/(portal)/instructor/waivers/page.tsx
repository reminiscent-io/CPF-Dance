'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Badge, Button, EmptyState, PageHeader, PageSkeleton, SkeletonCardGrid, StatusDot, Table } from '@/components/ui'
import type { StatusTone } from '@/components/ui'
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline'
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

  const getStatusTone = (status: string): StatusTone => {
    switch (status) {
      case 'signed':
      case 'active':
        return 'positive'
      case 'expired':
      case 'declined':
        return 'attention'
      default:
        return 'neutral'
    }
  }

  const formatStatus = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : status

  const waiverColumns = [
    {
      key: 'title',
      header: 'Title',
      render: (waiver: IssuedWaiver) => (
        <span className="font-medium">{waiver.title}</span>
      )
    },
    {
      key: 'waiver_type',
      header: 'Type',
      render: (waiver: IssuedWaiver) => (
        <span className="capitalize">{waiver.waiver_type}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (waiver: IssuedWaiver) => (
        <StatusDot tone={getStatusTone(waiver.status)} label={formatStatus(waiver.status)} />
      )
    },
    {
      key: 'created_at',
      header: 'Issued',
      render: (waiver: IssuedWaiver) => new Date(waiver.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      hoverOnly: true,
      render: (waiver: IssuedWaiver) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/instructor/waivers/${waiver.id}`)
          }}
        >
          View
        </Button>
      )
    }
  ]

  if (loading) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="cards" withAction />
      </PortalLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Waivers"
        subtitle="Create templates and issue waivers to students or studios"
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            New template
          </Button>
        }
      />

      <div className="mt-header-gap space-y-6">
        {/* Templates Section */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">
              Templates ({templates.length})
            </h2>
            <Button variant="secondary">
              Upload PDF template
            </Button>
          </div>

          <div className="mt-4">
            {loadingTemplates ? (
              <SkeletonCardGrid count={3} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" gap="gap-4" />
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-champagne-200 bg-champagne-50">
                <EmptyState
                  icon={<DocumentTextIcon />}
                  message="Create a template to start issuing waivers."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg border border-champagne-200 bg-champagne-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold text-charcoal-950">
                        {template.title}
                      </h3>
                      {template.content_type === 'pdf' && (
                        <Badge variant="default">PDF</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="mt-2 text-sm text-charcoal-500">{template.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="default">{template.waiver_type}</Badge>
                      {template.is_shared && (
                        <Badge variant="default">Shared</Badge>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleIssueWaiver(template)}
                        className="flex-1"
                      >
                        Issue waiver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/instructor/waivers/templates/${template.id}`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Issued Waivers Section */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-charcoal-950">
            Issued waivers ({issuedWaivers.length})
          </h2>

          <div className="mt-4">
            <Table
              data={issuedWaivers}
              columns={waiverColumns}
              loading={loadingWaivers}
              onRowClick={(waiver) => router.push(`/instructor/waivers/${waiver.id}`)}
              empty={
                <EmptyState
                  icon={<DocumentTextIcon />}
                  message="Waivers you issue will appear here."
                />
              }
            />
          </div>
        </section>
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
