import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date'
import { formatShortCaption, formatExpandedCaption } from '@/lib/utils/format-gallery-meta'

interface ImageCaptionProps {
  assetId: string
  instrument: string
  date: string
}

export function ImageCaption({ assetId, instrument, date }: ImageCaptionProps) {
  const short = formatShortCaption(instrument, date)
  const expanded = formatExpandedCaption(assetId, instrument, date)

  return (
    <div className="relative mt-1.5 min-h-[1.25rem]">
      <p
        aria-hidden="true"
        className="font-mono text-[11px] text-luna-fg-3 tracking-[0.02em] truncate"
      >
        {short || ' '}
      </p>
      <p
        aria-label={expanded}
        className={cn(
          'absolute inset-0',
          'font-mono text-[11px] text-luna-fg-2 tracking-[0.02em]',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity duration-[120ms]',
          'pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto',
          'whitespace-nowrap overflow-hidden text-ellipsis',
          'bg-luna-base-2',
        )}
      >
        <span className="font-mono">{assetId}</span>
        {instrument && instrument !== 'Unknown instrument' && (
          <span className="text-luna-fg-3"> · {instrument}</span>
        )}
        {date && <span className="text-luna-fg-3"> · {formatDate(date)}</span>}
      </p>
    </div>
  )
}
