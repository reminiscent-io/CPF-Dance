'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Button, EmptyState, PageHeader, useToast, Spinner } from '@/components/ui'
import { PhotoIcon, DocumentIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { UploadAssetModal } from '@/components/UploadAssetModal'

interface Asset {
  id: string
  title: string
  file_url: string
  file_type: string
  file_size: number
  instructor_id: string
  created_at: string
  instructor?: {
    full_name: string
  }
}

export default function AssetsPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchAssets()
    }
  }, [user?.id])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch assets')

      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Error fetching assets:', error)
      addToast('Failed to load assets', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (asset: Asset) => {
    setAssets(prev => [asset, ...prev])
    setShowUploadModal(false)
    addToast('Asset uploaded successfully', 'success')
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete asset')

      setAssets(prev => prev.filter(a => a.id !== assetId))
      addToast('Asset deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting asset:', error)
      addToast('Failed to delete asset', 'error')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/')
  }

  const canDelete = (asset: Asset) => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    return asset.instructor_id === profile.id
  }

  if (authLoading || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Assets"
        subtitle="Promotional images and PDFs for classes and social media"
        action={
          <Button onClick={() => setShowUploadModal(true)}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Upload asset
          </Button>
        }
      />

      <div className="mt-header-gap">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState
              icon={<PhotoIcon />}
              message="Your asset library is empty."
              action={
                <Button onClick={() => setShowUploadModal(true)}>
                  <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
                  Upload asset
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50"
              >
                {/* Preview */}
                <div className="aspect-video bg-champagne-100 flex items-center justify-center overflow-hidden">
                  {isImage(asset.file_type) ? (
                    <img
                      src={asset.file_url}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DocumentIcon className="w-10 h-10 text-champagne-400" aria-hidden="true" />
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium text-charcoal-950 truncate mb-1" title={asset.title}>
                    {asset.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-charcoal-400">
                    <span>{formatFileSize(asset.file_size)}</span>
                    <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                  </div>
                  {asset.instructor && (
                    <p className="text-xs text-charcoal-400 mt-1">by {asset.instructor.full_name}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-champagne-200 bg-champagne-50 hover:bg-champagne-100 transition-colors"
                    title="View/Download"
                  >
                    <PhotoIcon className="w-5 h-5 text-charcoal-700" aria-hidden="true" />
                  </a>
                  {canDelete(asset) && (
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 rounded-lg border border-champagne-200 bg-champagne-50 hover:bg-champagne-100 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5 text-rose-700" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadAssetModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </PortalLayout>
  )
}
