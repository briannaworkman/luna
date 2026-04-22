'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LunarLocation } from '@/components/globe/types'

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
        'fixed inset-0 z-30 flex items-center justify-center',
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
          // Desktop: 82% viewport; tablet+: 100% (handled via max-w/max-h)
          'relative flex flex-col',
          'bg-luna-base-2 border border-luna-hairline',
          // Desktop radius; removed at <768px via breakpoint override below
          'rounded-lg max-[767px]:rounded-none',
          'overflow-hidden',
        )}
        style={{
          // 82% viewport on desktop; full screen on mobile
          width:     'min(82vw, 100vw)',
          height:    'min(82vh, 100vh)',
          maxWidth:  '100vw',
          maxHeight: '100vh',
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
        <div className="flex items-center justify-between px-8 py-5 border-b border-luna-hairline shrink-0">
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

        {/* ── Gallery body — placeholder until Screen 1.5 images land ── */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="h-full flex flex-col gap-4">
            {/* Hero image placeholder */}
            <div
              className="w-full rounded-md border border-luna-hairline flex-1 min-h-0 flex items-center justify-center"
              style={{ background: 'var(--luna-base-3)' }}
            >
              <span className="font-mono text-[13px] text-luna-fg-4 tracking-[0.02em]">
                Hero image
              </span>
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
        <div className="px-8 py-5 border-t border-luna-hairline shrink-0 flex items-center justify-between gap-4">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3">
            Select up to 4 images to include in your query
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Skip
            </Button>
            <Button onClick={() => location && onContinue(location)}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
