'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'
import { formatDate } from '@/lib/utils/date'

interface ImageGalleryDialogProps {
  location: LunarLocation | null
  open: boolean
  onClose: () => void
  onContinue: (location: LunarLocation) => void
}

export function ImageGalleryDialog({
  location,
  open,
  onClose,
  onContinue,
}: ImageGalleryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [hero, setHero] = useState<NasaImage | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroImgError, setHeroImgError] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !location) return
    setHero(null)
    setHeroLoading(true)
    setHeroImgError(false)

    const params = new URLSearchParams({
      name: location.name,
      lat: String(location.lat),
      lon: String(location.lon),
    })

    fetch(`/api/nasa-images?${params}`)
      .then(r => r.json())
      .then(data => setHero(data.images?.[0] ?? null))
      .catch(() => setHero(null))
      .finally(() => setHeroLoading(false))
  }, [open, location])

  function handleBackdropClick(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  return (
    // Backdrop — #050C1A at ~82% opacity; pointer-events controlled by open state
    <div
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-30 flex',
        'max-[767px]:items-start max-[767px]:justify-start items-center justify-center',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{
        backgroundColor: 'rgba(5, 12, 26, 0.82)',
        transition: open
          ? 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'opacity 150ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        opacity: open ? 1 : 0,
      }}
      aria-modal="true"
      role="dialog"
      aria-label={location ? `Image gallery — ${location.name}` : 'Image gallery'}
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className={cn(
          'relative flex flex-col',
          'bg-luna-base-2 border border-luna-hairline',
          'rounded-lg max-[767px]:rounded-none',
          'overflow-hidden',
          // Mobile (≤767px): full screen; Desktop (≥768px): 82% viewport
          'max-[767px]:w-screen max-[767px]:h-screen',
          'min-[768px]:w-[82vw] min-[768px]:h-[82vh]',
        )}
        style={{
          boxShadow: 'var(--luna-shadow-lg)',
          // Opening: scale 96→100% + opacity 0→1 over 200ms
          transition: open
            ? 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 150ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 150ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          transform: open ? 'scale(1)' : 'scale(0.96)',
          opacity:   open ? 1 : 0,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 max-[767px]:px-5 py-5 border-b border-luna-hairline shrink-0">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan">
              Image Gallery
            </span>
            <h2 className="font-sans font-medium text-[22px] leading-[1.15] tracking-[-0.01em] text-luna-fg m-0">
              {location?.name ?? ''}
            </h2>
          </div>
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close image gallery"
          >
            <X size={18} strokeWidth={1.5} />
          </Button>
        </div>

        {/* ── Gallery body ── */}
        <div className="flex-1 overflow-y-auto p-8 max-[767px]:p-5">
          <div className="flex flex-col gap-4">
            {/* Hero image */}
            <div className="w-full shrink-0 flex flex-col gap-2">
              <div
                className="w-full rounded-md border border-luna-hairline overflow-hidden"
                style={{ height: 'clamp(280px, 30vh, 320px)' }}
              >
                {heroLoading || (!hero && !heroLoading) ? (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--luna-base-3)' }}
                  >
                    {heroLoading ? (
                      <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">
                        Loading…
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">
                        No imagery available
                      </span>
                    )}
                  </div>
                ) : hero && !heroImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.thumbUrl}
                    alt={`${location?.name ?? 'Location'} — ${hero.instrument}`}
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    onError={() => setHeroImgError(true)}
                  />
                ) : (
                  // Fallback when image fails to load — show asset ID, no broken icon
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--luna-base-3)' }}
                  >
                    <span className="font-mono text-[11px] text-luna-fg-3 tracking-[0.02em]">
                      {hero?.assetId ?? ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Caption */}
              {hero && (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">
                    {hero.assetId}
                  </span>
                  {hero.instrument && (
                    <>
                      <span className="text-luna-fg-4 text-[11px]">·</span>
                      <span className="font-sans text-[11px] text-luna-fg-3">
                        {hero.instrument}
                      </span>
                    </>
                  )}
                  {hero.date && (
                    <>
                      <span className="text-luna-fg-4 text-[11px]">·</span>
                      <span className="font-mono text-[11px] text-luna-fg-3 tracking-[0.02em]">
                        Last photographed {formatDate(hero.date)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail strip — 4 slots */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded border border-luna-hairline flex items-center justify-center"
                  style={{ background: 'var(--luna-base-3)' }}
                >
                  <span className="font-mono text-[11px] text-luna-fg-4">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-8 max-[767px]:px-5 py-5 border-t border-luna-hairline shrink-0 flex items-center justify-between gap-4 max-[767px]:flex-col max-[767px]:items-start">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 max-[767px]:order-2 max-[767px]:w-full">
            Select up to 4 images to include in your query
          </span>
          <div className="flex items-center gap-3 max-[767px]:order-1 max-[767px]:w-full max-[767px]:flex-col">
            <Button variant="outline" onClick={onClose} className="max-[767px]:w-full">
              Skip
            </Button>
            <Button onClick={() => location && onContinue(location)} className="max-[767px]:w-full">
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
