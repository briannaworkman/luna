export function HeroSkeleton() {
  return (
    <div
      className="w-full rounded-md animate-pulse bg-luna-base-1"
      style={{ height: 'clamp(280px, 30vh, 320px)' }}
      aria-hidden="true"
    />
  )
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 min-[768px]:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="aspect-square rounded animate-pulse bg-luna-base-1"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
