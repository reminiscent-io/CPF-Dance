'use client'

import { useState, useEffect } from 'react'
import { Button, Spinner } from '@/components/ui'
import { PhotoIcon, DocumentIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { UploadAssetModal } from '@/components/UploadAssetModal'

interface Asset {
  id: string
  title: string
  file_url: string
  file_type: string
  file_size: number
  instructor_id: string
  created_at: string
}

interface AssetSelectorProps {
  selectedAssetId?: string | null
  onSelect: (assetId: string | null) => void
  label?: string
  showUploadButton?: boolean
}

export function AssetSelector({
  selectedAssetId,
  onSelect,
  label = "Promotional Image/Document",
  showUploadButton = true
}: AssetSelectorProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch assets')

      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (asset: Asset) => {
    setAssets(prev => [asset, ...prev])
    setShowUploadModal(false)
    onSelect(asset.id)
  }

  const selectedAsset = assets.find(a => a.id === selectedAssetId)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {selectedAsset ? (
        // Show selected asset
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
              {isImage(selectedAsset.file_type) ? (
                <img
                  src={selectedAsset.file_url}
                  alt={selectedAsset.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <DocumentIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{selectedAsset.title}</h4>
              <p className="text-sm text-gray-500">{formatFileSize(selectedAsset.file_size)}</p>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium mt-2"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Show selection options
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowModal(!showModal)}
            className="w-full"
          >
            <PhotoIcon className="w-5 h-5 mr-2" />
            Select from Assets
          </Button>

          {showUploadButton && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadModal(true)}
              className="w-full"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Upload New Asset
            </Button>
          )}

          {showModal && (
            <div className="border border-gray-300 rounded-lg p-4 mt-2 max-h-96 overflow-y-auto bg-white">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Select an Asset</h4>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PhotoIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No assets available</p>
                  {showUploadButton && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowModal(false)
                        setShowUploadModal(true)
                      }}
                      className="mt-3"
                    >
                      Upload your first asset
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onSelect(asset.id)
                        setShowModal(false)
                      }}
                      className="border border-gray-200 rounded-lg p-2 hover:border-rose-400 hover:bg-rose-50 transition-colors text-left"
                    >
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                        {isImage(asset.file_type) ? (
                          <img
                            src={asset.file_url}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <DocumentIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate" title={asset.title}>
                        {asset.title}
                      </p>
                      <p className="text-xs text-gray-500">{formatFileSize(asset.file_size)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <UploadAssetModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}
