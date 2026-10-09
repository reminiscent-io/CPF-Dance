// Shared by the editor and its route's loading state, so it can't pull in Konva.

export function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the editor" className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
      <div>
        <div className="skeleton-shimmer h-9 w-64 rounded" />
        <div className="skeleton-shimmer mx-auto mt-5 aspect-[4/5] w-full max-w-md rounded-lg" />
      </div>
      <div className="mt-5 space-y-3 lg:mt-14">
        <div className="skeleton-shimmer h-control w-full rounded-lg" />
        <div className="skeleton-shimmer h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}
