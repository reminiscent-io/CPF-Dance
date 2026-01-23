'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface HeadshotUploadProps {
  userId: string
  currentUrl: string | null
  userName: string
  onUploadComplete: (url: string | null) => void
}

export function HeadshotUpload({
  userId,
  currentUrl,
  userName,
  onUploadComplete
}: HeadshotUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image must be less than 5MB')
      return
    }

    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `headshot.${fileExt}`
      const filePath = `${userId}/${fileName}`

      // Delete existing headshot if any (to avoid orphaned files)
      await supabase.storage
        .from('headshots')
        .remove([`${userId}/headshot.jpg`, `${userId}/headshot.png`, `${userId}/headshot.webp`, `${userId}/headshot.gif`])

      // Upload new headshot
      const { error: uploadError } = await supabase.storage
        .from('headshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('headshots')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onUploadComplete(publicUrl)
      setPreviewUrl(null)
    } catch (err: any) {
      console.error('Error uploading headshot:', err)
      setError(err.message || 'Failed to upload image')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your headshot?')) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Remove all possible headshot files
      await supabase.storage
        .from('headshots')
        .remove([`${userId}/headshot.jpg`, `${userId}/headshot.png`, `${userId}/headshot.webp`, `${userId}/headshot.gif`])

      // Clear avatar URL in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onUploadComplete(null)
    } catch (err: any) {
      console.error('Error removing headshot:', err)
      setError(err.message || 'Failed to remove image')
    } finally {
      setUploading(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const displayUrl = previewUrl || currentUrl

  return (
    <div className="flex flex-col items-start gap-4">
      {/* Avatar display */}
      <div className="relative">
        <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar name={userName} size="lg" className="w-full h-full text-5xl" />
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Spinner className="text-white" />
          </div>
        )}
      </div>

      {/* Upload controls */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">
          Upload a headshot to personalize your profile
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileSelect}
            disabled={uploading}
          >
            {currentUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>

          {currentUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-400">
          JPEG, PNG, WebP, or GIF. Max 5MB.
        </p>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
