'use client'
import type { NasaImage } from '@/lib/types/nasa'
import { StripItem } from '@/components/gallery/StripItem'

export function ImageryStrip({
  images,
  onRemove,
}: {
  images: NasaImage[]
  onRemove: (assetId: string) => void
}) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3">
        {`Analyzing with ${images.length} ${images.length === 1 ? 'image' : 'images'}`}
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {images.map((img) => (
          <StripItem key={img.assetId} img={img} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}
