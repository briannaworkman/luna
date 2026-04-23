'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { X, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage, NasaImagesResponse } from '@/lib/types/nasa'
import { formatDate } from '@/lib/utils/date'
import { fetchJson } from '@/lib/utils/fetch-with-timeout'
import { useDialogDismiss } from '@/lib/hooks/use-dialog-dismiss'
import {
  continueLabel,
  canSelectMore,
  toggleSelection,
  removeFromSelection,
  MAX_SELECTION,
} from '@/lib/gallery/selection'

const MAX_IMAGES = 22

interface ImageGalleryDialogProps {
  location: LunarLocation | null
  open: boolean
  onClose: () => void
  onContinue: (location: LunarLocation, selectedImages: NasaImage[]) => void
}

function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--luna-base-3)' }}>
        <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">—</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  )
}

function ToggleButton({
  image,
  isSelected,
  isAtCap,
  onToggle,
  onAttemptWhenFull,
}: {
  image: NasaImage
  isSelected: boolean
  isAtCap: boolean
  onToggle: (img: NasaImage) => void
  onAttemptWhenFull: (id: string) => void
}) {
  const disabled = !isSelected && isAtCap
  return (
    <button
      type="button"
      aria-label={isSelected ? 'Remove from context' : 'Add to context'}
      aria-pressed={isSelected}
      style={{ minWidth: 44, minHeight: 44 }}
      className={cn(
        'absolute top-1 right-1 z-10',
        'flex items-center justify-center rounded-full',
        'transition-all duration-[120ms]',
        isSelected
          ? 'bg-luna-cyan text-luna-base opacity-100'
          : 'bg-transparent border border-luna-fg-4 text-luna-fg-4',
        disabled ? 'opacity-30 cursor-not-allowed' : !isSelected ? 'opacity-60 hover:opacity-100' : '',
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (disabled) { onAttemptWhenFull(image.assetId); return }
        onToggle(image)
      }}
    >
      {isSelected ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
    </button>
  )
}

function InlineTooltip() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-0 right-14 z-20 whitespace-nowrap font-mono text-[10px] text-luna-base bg-luna-cyan px-2 py-1 rounded pointer-events-none"
      style={{ boxShadow: 'var(--luna-shadow-sm)' }}
    >
      Maximum 4 images — remove one to add another
    </div>
  )
}

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

export function ImageGalleryDialog({
  location,
  open,
  onClose,
  onContinue,
}: ImageGalleryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<NasaImage[]>([])
  const [loading, setLoading] = useState(false)
  const [heroImgError, setHeroImgError] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedImages, setSelectedImages] = useState<NasaImage[]>([])
  const [tooltipAssetId, setTooltipAssetId] = useState<string | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleBackdropClick = useDialogDismiss(dialogRef, open, onClose)

  const hero = images[0] ?? null
  const thumbnails = images.slice(1, MAX_IMAGES)

  const selectedIds = new Set(selectedImages.map((i) => i.assetId))
  const isAtCap = selectedImages.length >= MAX_SELECTION

  useEffect(() => {
    if (!open || !location) return
    const initial = `${location.name} moon crater`
    setInputValue(initial)
    setSubmittedQuery(initial)
    setSelectedImages([])
    setTooltipAssetId(null)
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
  }, [open, location])

  useEffect(() => {
    return () => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }
  }, [])

  useEffect(() => {
    if (!open || !submittedQuery) return
    setImages([])
    setLoading(true)
    setHeroImgError(false)

    let cancelled = false
    const params = new URLSearchParams({ q: submittedQuery })
    ;(async () => {
      try {
        const data = await fetchJson<NasaImagesResponse>(`/api/nasa-images?${params}`)
        if (!cancelled) setImages(data.images.slice(0, MAX_IMAGES))
      } catch {
        if (!cancelled) setImages([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [submittedQuery, open])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) setSubmittedQuery(trimmed)
  }

  function handleToggle(image: NasaImage) {
    // Trigger tooltip based on currently-rendered state when adding at cap
    if (!selectedIds.has(image.assetId) && isAtCap) {
      handleAttemptWhenFull(image.assetId)
    }
    // Authoritative cap guard lives inside the functional updater so rapid
    // clicks across separate render passes can't bypass it
    setSelectedImages((prev) => {
      const alreadySelected = prev.some((i) => i.assetId === image.assetId)
      if (!alreadySelected && prev.length >= MAX_SELECTION) return prev
      return toggleSelection(prev, image)
    })
  }

  function handleRemove(assetId: string) {
    setSelectedImages((prev) => removeFromSelection(prev, assetId))
  }

  function handleAttemptWhenFull(assetId: string) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setTooltipAssetId(assetId)
    tooltipTimerRef.current = setTimeout(() => setTooltipAssetId(null), 2000)
  }

  function renderHero() {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--luna-base-3)' }}>
          <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">Loading…</span>
        </div>
      )
    }
    if (!hero) {
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--luna-base-3)' }}>
          <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.02em]">No imagery available</span>
        </div>
      )
    }
    if (heroImgError) {
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--luna-base-3)' }}>
          <span className="font-mono text-[11px] text-luna-fg-3 tracking-[0.02em]">{hero.assetId}</span>
        </div>
      )
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={hero.thumbUrl}
        alt={`${location?.name ?? 'Location'} — ${hero.instrument}`}
        className="w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        onError={() => setHeroImgError(true)}
      />
    )
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

        {/* ── Scrollable content ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8 max-[767px]:p-5">
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex items-center gap-2 shrink-0">
              <SearchInput
                className="flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onClear={() => {
                  const initial = location ? `${location.name} moon crater` : ''
                  setInputValue(initial)
                  setSubmittedQuery(initial)
                }}
                placeholder="Search NASA image library…"
              />
              <Button type="submit" variant="outline" disabled={loading || !inputValue.trim()}>
                Search
              </Button>
            </form>

            <div className="w-full shrink-0 flex flex-col gap-2">
              {/* Hero image with toggle */}
              <div
                className="relative w-full rounded-md overflow-hidden"
                style={{
                  height: 'clamp(280px, 30vh, 320px)',
                  border: '2px solid',
                  borderColor: hero && selectedIds.has(hero.assetId) ? 'var(--luna-cyan)' : 'var(--luna-hairline)',
                  transition: 'border-color 120ms',
                }}
              >
                {renderHero()}
                {hero && !loading && (
                  <ToggleButton
                    image={hero}
                    isSelected={selectedIds.has(hero.assetId)}
                    isAtCap={isAtCap}
                    onToggle={handleToggle}
                    onAttemptWhenFull={handleAttemptWhenFull}
                  />
                )}
                {hero && tooltipAssetId === hero.assetId && <InlineTooltip />}
              </div>

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

            {thumbnails.length > 0 && (
              <div className="grid grid-cols-2 min-[768px]:grid-cols-3 gap-3 shrink-0">
                {thumbnails.map((img) => (
                  <div
                    key={img.assetId}
                    className="relative aspect-square rounded"
                    style={{
                      border: '2px solid',
                      borderColor: selectedIds.has(img.assetId) ? 'var(--luna-cyan)' : 'var(--luna-hairline)',
                      transition: 'border-color 120ms',
                    }}
                  >
                    <div className="absolute inset-0 rounded overflow-hidden">
                      <LazyImage src={img.thumbUrl} alt={`${location?.name ?? 'Location'} — ${img.instrument}`} />
                    </div>
                    <ToggleButton
                      image={img}
                      isSelected={selectedIds.has(img.assetId)}
                      isAtCap={isAtCap}
                      onToggle={handleToggle}
                      onAttemptWhenFull={handleAttemptWhenFull}
                    />
                    {tooltipAssetId === img.assetId && <InlineTooltip />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Pinned selection strip ───────────────────────────────── */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            transition: 'max-height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: selectedImages.length > 0 ? '120px' : '0px',
            opacity: selectedImages.length > 0 ? 1 : 0,
            pointerEvents: selectedImages.length > 0 ? 'auto' : 'none',
          }}
        >
          <div className="px-8 max-[767px]:px-5 pt-3 pb-3 border-t border-luna-hairline">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 block mb-2">
              Added to context
            </span>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', transition: 'all 150ms ease-out' }}
            >
              {selectedImages.map((img) => (
                <StripItem key={img.assetId} img={img} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-8 max-[767px]:px-5 py-5 border-t border-luna-hairline shrink-0 flex items-center justify-between gap-4 max-[767px]:flex-col max-[767px]:items-start">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4 max-[767px]:order-2 max-[767px]:w-full">
            {selectedImages.length}/{MAX_SELECTION}
          </span>
          <div className="flex items-center gap-3 max-[767px]:order-1 max-[767px]:w-full">
            <Button
              onClick={() => location && onContinue(location, selectedImages)}
              className="max-[767px]:w-full"
            >
              {continueLabel(selectedImages.length)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
