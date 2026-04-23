'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocationChip } from './LocationChip'
import { QueryTextarea } from './QueryTextarea'
import { TemplateChips } from './TemplateChips'
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
  defaultImages: NasaImage[]
  onBack: () => void
  onSubmit: (payload: QueryPayload) => void
}

export function QueryComposer({ location, defaultImages, onBack, onSubmit }: QueryComposerProps) {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<NasaImage[]>(defaultImages)
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

  const handleRemoveImage = useCallback((assetId: string) => {
    setImages((prev) => prev.filter((i) => i.assetId !== assetId))
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      // Rapid empty submits: reset across a frame so the animation class
      // actually re-triggers instead of React batching into a no-op update
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

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base">
      <AgentRail className="h-full" />
      <main className="flex-1 overflow-y-auto px-10 py-12">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 self-start text-luna-fg-3 hover:text-luna-fg transition-colors"
            aria-label="Back to globe"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Locations</span>
          </button>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan">
              Query Composer
            </span>
            <h1 className="font-sans font-medium text-[32px] leading-[1.1] tracking-[-0.01em] text-luna-fg m-0">
              Research this location
            </h1>
          </div>

          <LocationChip location={location} className="self-start" />

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
            <span className="font-mono text-[11px] tracking-[0.04em] text-luna-hairline-2 pointer-events-none">
              ⌘↵ to analyze
            </span>
            <Button onClick={handleSubmit}>
              Analyze location
              <ArrowRight size={14} strokeWidth={1.5} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
