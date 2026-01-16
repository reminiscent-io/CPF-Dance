'use client'

import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu'
import { getRelativeTimeString } from '@/lib/utils/date-helpers'
import { Note } from '@/lib/utils/date-helpers'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

export interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
  onChangeVisibility?: (noteId: string) => void
  currentUserName?: string
}

export function NoteFeedItem({
  note,
  onEdit,
  onDelete,
  onChangeVisibility,
  currentUserName
}: NoteCardProps) {
  const handleNoteClick = () => {
    onEdit(note)
  }

  const handleEditClick = () => {
    onEdit(note)
  }

  const handleDeleteClick = () => {
    onDelete(note.id)
  }

  const handleVisibilityClick = () => {
    onChangeVisibility?.(note.id)
  }

  // Truncate HTML content for preview
  const getContentPreview = (html: string, maxLength: number = 500): string => {
    if (!html) return ''
    return html.length > maxLength ? html.substring(0, maxLength) + '...' : html
  }

  // Get author name for display
  const authorName = (note as any).author_name || (note.is_personal ? currentUserName : 'Instructor') || 'Unknown'

  // Determine if note is shared (visible to others)
  const isShared = !note.is_personal ||
    (note.visibility !== 'private' && note.visibility !== undefined)

  // Get visibility badge
  const getVisibilityBadge = () => {
    if (!note.is_personal) {
      // Instructor notes shared with dancer
      return (
        <Badge variant="success" size="sm">
          Shared
        </Badge>
      )
    }

    if (note.visibility === 'private') {
      return (
        <Badge variant="default" size="sm">
          Private Note
        </Badge>
      )
    }

    // Personal note shared with instructor
    return (
      <Badge variant="success" size="sm">
        Shared
      </Badge>
    )
  }

  // Get linked class info
  const linkedClass = (note as any).classes || (note as any).personal_classes

  return (
    <div
      onClick={handleNoteClick}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:shadow-sm transition-all"
    >
      {/* Header Row: Avatar + Author + Date + Menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={authorName} size="md" />
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {authorName}
            </div>
            <div className="text-xs text-gray-500">
              {getRelativeTimeString(note.created_at)}
            </div>
          </div>
        </div>

        {/* Only show dropdown menu for personal notes */}
        {note.is_personal && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </span>
              </DropdownMenuItem>
              {onChangeVisibility && (
                <DropdownMenuItem onClick={handleVisibilityClick}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Change Visibility
                  </span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteClick} destructive>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Title */}
      {note.title && (
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {note.title}
        </h3>
      )}

      {/* Linked class info */}
      {linkedClass && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {linkedClass.title}
            {linkedClass.start_time && (
              <span className="text-gray-400 ml-1">
                ({new Date(linkedClass.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Content preview */}
      <div
        className="text-sm text-gray-600 mb-3 line-clamp-3 rich-text-preview"
        dangerouslySetInnerHTML={createSanitizedHtml(getContentPreview(note.content))}
      />

      {/* Footer Row: Status Badge + Tags */}
      <div className="flex items-center justify-between">
        {/* Visibility badge */}
        <div>
          {getVisibilityBadge()}
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {note.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <Badge variant="default" size="sm">
                +{note.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
