'use client'

import { useState } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { getRelativeTimeString } from '@/lib/utils/date-helpers'
import { Note } from '@/lib/utils/date-helpers'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

interface NoteFeedItemProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
  onPin: (noteId: string) => void
}

type RevealedAction = 'delete' | 'pin' | null

export function NoteFeedItem({ note, onEdit, onDelete, onPin }: NoteFeedItemProps) {
  const [revealedAction, setRevealedAction] = useState<RevealedAction>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)

    if (info.offset.x < -50) {
      setRevealedAction('delete')
    } else if (info.offset.x > 50) {
      setRevealedAction('pin')
    } else {
      setRevealedAction(null)
    }
  }

  const handleActionClick = (action: 'delete' | 'pin') => {
    if (action === 'delete') {
      onDelete(note.id)
    } else {
      onPin(note.id)
    }
    setRevealedAction(null)
  }

  const handleNoteClick = () => {
    if (!isDragging && !revealedAction) {
      onEdit(note)
    }
  }

  // Truncate HTML content for preview (keep rich text formatting)
  const getContentPreview = (html: string, maxLength: number = 500): string => {
    if (!html) return ''
    // Truncate if too long, but keep HTML structure
    return html.length > maxLength ? html.substring(0, maxLength) + '...' : html
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background actions (revealed on swipe) */}
      {revealedAction === 'delete' && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-red-500">
          <button
            onClick={() => handleActionClick('delete')}
            className="text-white font-medium text-sm"
            aria-label="Delete note"
          >
            Delete
          </button>
        </div>
      )}

      {revealedAction === 'pin' && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-center w-20 bg-yellow-500">
          <button
            onClick={() => handleActionClick('pin')}
            className="text-white font-medium text-sm"
            aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
          >
            {note.is_pinned ? 'Unpin' : 'Pin'}
          </button>
        </div>
      )}

      {/* Swipeable note content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onClick={handleNoteClick}
        className="bg-white border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors md:hover:shadow-sm"
        style={{ x: revealedAction === 'delete' ? -80 : revealedAction === 'pin' ? 80 : 0 }}
        animate={{ x: revealedAction === 'delete' ? -80 : revealedAction === 'pin' ? 80 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header: Title and timestamp */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {note.is_pinned && (
              <span className="text-yellow-500 text-lg flex-shrink-0" aria-label="Pinned">
                ⭐
              </span>
            )}
            {/* Instructor vs Personal icon */}
            {note.is_personal ? (
              <svg
                className="w-4 h-4 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-label="Personal note"
              >
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 flex-shrink-0 text-purple-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-label="Instructor feedback"
              >
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            )}
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {note.title || 'Untitled Note'}
            </h3>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {getRelativeTimeString(note.created_at)}
          </span>
        </div>

        {/* Linked class info */}
        {((note as any).classes || (note as any).personal_classes) && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {(note as any).classes?.title || (note as any).personal_classes?.title}
              {((note as any).classes?.start_time || (note as any).personal_classes?.start_time) && (
                <span className="text-gray-400 ml-1">
                  ({new Date((note as any).classes?.start_time || (note as any).personal_classes?.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Content preview with rich text formatting */}
        <div
          className="text-sm text-gray-600 mb-2 line-clamp-3 rich-text-preview"
          dangerouslySetInnerHTML={createSanitizedHtml(getContentPreview(note.content))}
        />

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <Badge variant="default" size="sm">
                +{note.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </motion.div>

      {/* Desktop-only hover actions (shown when swipe is disabled) */}
      <div className="hidden md:flex absolute top-2 right-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPin(note.id)
          }}
          className="p-1.5 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
          aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
        >
          <span className="text-sm">{note.is_pinned ? '⭐' : '☆'}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note.id)
          }}
          className="p-1.5 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
          aria-label="Delete note"
        >
          <span className="text-sm">🗑️</span>
        </button>
      </div>
    </div>
  )
}
