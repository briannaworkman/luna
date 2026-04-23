'use client'
// NOTE: StripItem duplicates ImageGalleryDialog.tsx#StripItem —
// consolidate into a shared component in a follow-up PR.

import Image from 'next/image'
import { X } from 'lucide-react'
import type { NasaImage } from '@/lib/types/nasa'

function StripItem({ img, onRemove }: { img: NasaImage; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative w-12 h-12 rounded border border-luna-hairline overflow-hidden group">
        <Image src={img.thumbUrl} alt={img.assetId} fill unoptimized className="object-cover" />
        <button
          type="button"
          aria-label={`Remove ${img.assetId}`}
          onClick={() => onRemove(img.assetId)}
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]"
        >
          <X size={14} strokeWidth={1.5} className="text-luna-fg" />
        </button>
      </div>
      <span className="font-mono text-[10px] text-luna-fg-4 tracking-[0.02em] max-w-[48px] truncate">
        {img.assetId}
      </span>
    </div>
  )
}

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
