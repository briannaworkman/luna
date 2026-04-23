import { cn } from '@/lib/utils'

type BannerVariant = 'limited' | 'zero-results' | 'error'

interface CoverageBannerProps {
  variant: BannerVariant
}

const COPY: Record<BannerVariant, string> = {
  'limited': 'Limited imagery available for this region — showing nearest results',
  'zero-results': 'No direct imagery found for this location. You can still query from screen 2.',
  'error': 'Unable to load imagery for this location. You can still research without images.',
}

export function CoverageBanner({ variant }: CoverageBannerProps) {
  const isError = variant === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'rounded px-4 py-3 text-sm',
        isError ? 'text-luna-fg-2' : 'text-luna-cyan border',
      )}
      style={
        !isError
          ? {
              background: 'var(--luna-cyan-wash)',
              borderColor: 'var(--luna-cyan-edge)',
            }
          : undefined
      }
    >
      {COPY[variant]}
    </div>
  )
}
