'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocationHeader } from './LocationHeader'
import { QueryTextarea } from './QueryTextarea'
import { TemplateChips } from './TemplateChips'
import { SuggestedQuestions } from './SuggestedQuestions'
import { ImageryStrip } from './ImageryStrip'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

export interface QueryPayload {
  location: LunarLocation
  query: string
  images: NasaImage[]
}

interface QueryComposerProps {
  location: LunarLocation
  images: NasaImage[]
  onImagesChange: (images: NasaImage[]) => void
  onOpenGallery: () => void
  onBack: () => void
  onSubmit: (payload: QueryPayload) => void
}

export function QueryComposer({
  location,
  images,
  onImagesChange,
  onOpenGallery,
  onBack,
  onSubmit,
}: QueryComposerProps) {
  const [query, setQuery] = useState('')
  const [shaking, setShaking] = useState(false)
  const [emptyHint, setEmptyHint] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shakeRafRef = useRef<number | null>(null)

  const handleTemplateSelect = useCallback((text: string) => {
    setQuery(text)
    setTimeout(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(text.length, text.length)
    }, 0)
  }, [])

  const handleRemoveImage = useCallback(
    (assetId: string) => {
      onImagesChange(images.filter((i) => i.assetId !== assetId))
    },
    [images, onImagesChange],
  )

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
      if (shakeRafRef.current !== null) cancelAnimationFrame(shakeRafRef.current)
      setShaking(false)
      shakeRafRef.current = requestAnimationFrame(() => {
        setShaking(true)
        shakeTimerRef.current = setTimeout(() => setShaking(false), 350)
      })
      setEmptyHint(true)
      return
    }
    setEmptyHint(false)
    onSubmit({ location, query: trimmed, images })
  }, [query, location, images, onSubmit])

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
      if (shakeRafRef.current !== null) cancelAnimationFrame(shakeRafRef.current)
    }
  }, [])

  const suggested = location.suggestedQuestions ?? []

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base">
      <AgentRail className="h-full" />
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 self-start text-luna-fg-3 hover:text-luna-fg transition-colors"
            aria-label="Back to globe"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Locations</span>
          </button>

          <LocationHeader location={location} />

          <div className="flex flex-col gap-4">
            <QueryTextarea
              ref={textareaRef}
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              shaking={shaking}
              emptyHint={emptyHint}
              placeholder={`Ask anything about ${location.name} — geology, landing conditions, mission history…`}
            />

            <TemplateChips onSelect={handleTemplateSelect} />

            <ImageryStrip images={images} onRemove={handleRemoveImage} />

            <div className="flex items-center justify-between gap-4">
              <span
                aria-hidden="true"
                className="font-mono text-[11px] tracking-[0.04em] text-luna-fg-4"
              >
                ⌘↵ to analyze
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="inline-flex items-center gap-2 h-9 px-3 font-sans font-medium text-[13px] text-luna-fg-3 hover:text-luna-fg border border-luna-hairline hover:border-luna-hairline-2 rounded-md transition-colors"
                >
                  <ImagePlus size={14} strokeWidth={1.5} aria-hidden="true" />
                  Attach imagery
                </button>
                <Button onClick={handleSubmit}>
                  Analyze location
                  <ArrowRight size={14} strokeWidth={1.5} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <SuggestedQuestions
            locationName={location.name}
            questions={suggested}
            onSelect={handleTemplateSelect}
          />
        </div>
      </main>
    </div>
  )
}
