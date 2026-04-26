'use client'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { NasaImage } from '@/lib/types/nasa'

export function StripItem({ img, onRemove }: { img: NasaImage; onRemove: (id: string) => void }) {
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
