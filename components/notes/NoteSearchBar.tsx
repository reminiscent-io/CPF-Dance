'use client'

import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

interface NoteSearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
  allTags: string[]
}

export function NoteSearchBar({
  searchTerm,
  onSearchChange,
  selectedTag,
  onTagSelect,
  allTags
}: NoteSearchBarProps) {
  const handleClearFilters = () => {
    onSearchChange('')
    onTagSelect(null)
  }

  const hasActiveFilters = searchTerm || selectedTag

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 pb-3 mb-4">
      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Tag filters with horizontal scroll */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => onTagSelect(null)}
                  className={`flex-shrink-0 transition-all ${
                    selectedTag === null ? 'scale-105' : ''
                  }`}
                >
                  <Badge
                    variant={selectedTag === null ? 'primary' : 'default'}
                    size="sm"
                    className="cursor-pointer whitespace-nowrap"
                  >
                    All
                  </Badge>
                </button>

                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagSelect(tag === selectedTag ? null : tag)}
                    className={`flex-shrink-0 transition-all ${
                      selectedTag === tag ? 'scale-105' : ''
                    }`}
                  >
                    <Badge
                      variant={selectedTag === tag ? 'primary' : 'default'}
                      size="sm"
                      className="cursor-pointer whitespace-nowrap"
                    >
                      {tag}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-700 underline"
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
