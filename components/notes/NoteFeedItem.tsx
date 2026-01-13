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
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {note.title || 'Untitled Note'}
            </h3>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {getRelativeTimeString(note.created_at)}
          </span>
        </div>

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
