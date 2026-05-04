'use client'

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
    <div className="mb-10">
      <div className="flex items-center gap-3 border-b border-champagne-200 pb-3 transition-colors focus-within:border-charcoal-700">
        <svg
          className="h-4 w-4 text-charcoal-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          aria-label="Search notes"
          placeholder="Search notes"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent border-0 p-0 text-charcoal-900 placeholder:text-charcoal-400 placeholder:italic text-sm focus:outline-none focus:ring-0"
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs uppercase tracking-[0.14em] text-charcoal-400 hover:text-ballet-pink-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ballet-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-champagne-50 rounded-sm"
            aria-label="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="mt-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex items-center gap-x-5 whitespace-nowrap text-xs italic">
            <button
              type="button"
              onClick={() => onTagSelect(null)}
              aria-pressed={selectedTag === null}
              className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ballet-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-champagne-50 rounded-sm ${
                selectedTag === null
                  ? 'text-ballet-pink-700'
                  : 'text-charcoal-400 hover:text-charcoal-700'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => {
              const active = selectedTag === tag
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagSelect(active ? null : tag)}
                  aria-pressed={active}
                  className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ballet-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-champagne-50 rounded-sm ${
                    active
                      ? 'text-ballet-pink-700'
                      : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
