'use client'

import { Avatar } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu'
import { Note, getRelativeTimeString } from '@/lib/utils/date-helpers'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

export interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete?: (noteId: string) => void
  onChangeVisibility?: (noteId: string) => void
  currentUserName?: string
  showActions?: boolean
  density?: 'default' | 'compact'
}

const PREVIEW_MAX_LENGTH_DEFAULT = 360
const PREVIEW_MAX_LENGTH_COMPACT = 200
const VISIBLE_TAG_LIMIT_DEFAULT = 4
const VISIBLE_TAG_LIMIT_COMPACT = 2

function getContentPreview(html: string, max: number): string {
  if (!html) return ''
  return html.length > max ? html.substring(0, max) + '…' : html
}

function getPersonalVisibilityLabel(note: Note): string | null {
  if (!note.is_personal || !note.visibility) return null
  if (note.visibility === 'private') return 'Private'
  return 'Shared with Courtney'
}

export function NoteFeedItem({
  note,
  onEdit,
  onDelete,
  onChangeVisibility,
  currentUserName,
  showActions = true,
  density = 'default'
}: NoteCardProps) {
  const open = () => onEdit(note)
  const handleEditClick = () => onEdit(note)
  const handleDeleteClick = () => onDelete?.(note.id)
  const handleVisibilityClick = () => onChangeVisibility?.(note.id)

  const isCompact = density === 'compact'

  const isInstructor = !note.is_personal
  const authorName =
    (note as any).author_name ||
    (isInstructor ? 'Courtney' : currentUserName) ||
    'You'
  const authorAvatarUrl = (note as any).author_avatar_url || null

  const linkedClass =
    (note as any).classes || (note as any).personal_classes
  const classTitle = linkedClass?.title

  const personalVisibilityLabel = getPersonalVisibilityLabel(note)

  const showDropdown =
    showActions && note.is_personal && (Boolean(onDelete) || Boolean(onChangeVisibility))

  const ariaLabel = note.title
    ? `Open note: ${note.title}`
    : `Open note from ${authorName}`

  const tagLimit = isCompact ? VISIBLE_TAG_LIMIT_COMPACT : VISIBLE_TAG_LIMIT_DEFAULT
  const previewLength = isCompact ? PREVIEW_MAX_LENGTH_COMPACT : PREVIEW_MAX_LENGTH_DEFAULT
  const visibleTags = note.tags?.slice(0, tagLimit) ?? []
  const overflowTagCount = (note.tags?.length ?? 0) - visibleTags.length

  return (
    <article
      className={`relative group bg-champagne-100 border rounded-lg shadow-soft transition-shadow hover:shadow-soft-lg focus-within:shadow-soft-lg focus-within:ring-2 focus-within:ring-ballet-pink-500 focus-within:ring-offset-2 focus-within:ring-offset-champagne-50 ${
        isCompact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      }`}
    >
      <header className={`flex items-start gap-3 ${isCompact ? 'mb-2' : 'mb-3'}`}>
        <Avatar src={authorAvatarUrl} name={authorName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-charcoal-900 truncate">
            {authorName}
          </div>
          <div className="text-xs italic text-charcoal-500">
            {getRelativeTimeString(note.created_at)}
          </div>
        </div>
        {(personalVisibilityLabel || showDropdown) && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {personalVisibilityLabel && (
              <span className="text-xs uppercase tracking-[0.14em] text-charcoal-400 hidden sm:inline">
                {personalVisibilityLabel}
              </span>
            )}
            {showDropdown && (
              <DropdownMenu>
                <DropdownMenuTrigger className="relative z-10 p-1 -m-1 text-charcoal-400 hover:text-charcoal-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ballet-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-champagne-50 rounded-sm">
                  <span className="sr-only">Note actions</span>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditClick}>Edit</DropdownMenuItem>
                  {onChangeVisibility && (
                    <DropdownMenuItem onClick={handleVisibilityClick}>
                      Change visibility
                    </DropdownMenuItem>
                  )}
                  {onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDeleteClick} destructive>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </header>

      <button
        type="button"
        onClick={open}
        aria-label={ariaLabel}
        className="absolute inset-0 rounded-lg cursor-pointer focus:outline-none"
      >
        <span className="sr-only">{ariaLabel}</span>
      </button>

      {note.title && (
        <h3
          className={`font-serif leading-snug text-charcoal-950 tracking-[-0.02em] ${
            isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
          }`}
        >
          {note.title}
        </h3>
      )}

      {classTitle && (
        <p
          className={`italic text-xs text-charcoal-500 mt-1 truncate ${
            isCompact ? 'mb-2' : 'mb-3'
          }`}
        >
          {classTitle}
        </p>
      )}

      <div
        className={`text-charcoal-700 rich-text-preview ${
          isCompact ? 'text-sm line-clamp-2 leading-relaxed' : 'line-clamp-3 max-w-[68ch]'
        } ${classTitle || !note.title ? '' : isCompact ? 'mt-1.5' : 'mt-2'}`}
        dangerouslySetInnerHTML={createSanitizedHtml(getContentPreview(note.content, previewLength))}
      />

      {visibleTags.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.14em] text-charcoal-400 ${
            isCompact ? 'mt-2' : 'mt-3'
          }`}
        >
          {visibleTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          {overflowTagCount > 0 && <span>+{overflowTagCount}</span>}
        </div>
      )}

      {personalVisibilityLabel && (
        <div
          className={`sm:hidden text-xs uppercase tracking-[0.14em] text-charcoal-400 ${
            isCompact ? 'mt-2' : 'mt-3'
          }`}
        >
          {personalVisibilityLabel}
        </div>
      )}
    </article>
  )
}
