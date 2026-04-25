'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/eyebrow'
import { LocationHeader } from './LocationHeader'
import { QueryTextarea } from './QueryTextarea'
import { SuggestedQuestions } from './SuggestedQuestions'
import { ImageryStrip } from './ImageryStrip'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import { useOpenGallery, useSelectedImages } from '@/providers/LocationSelectionProvider'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

export interface QueryPayload {
  location: LunarLocation
  query: string
  images: NasaImage[]
}

interface QueryComposerProps {
  location: LunarLocation
  onSubmit: (payload: QueryPayload) => void
  initialQuery?: string
}

export function QueryComposer({ location, onSubmit, initialQuery }: QueryComposerProps) {
  const router = useRouter()
  const [images, setImages] = useSelectedImages()
  const openGallery = useOpenGallery()
  const [query, setQuery] = useState(initialQuery ?? '')
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
      setImages(images.filter((i) => i.assetId !== assetId))
    },
    [images, setImages],
  )

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  const handleOpenGallery = useCallback(() => {
    openGallery(location, 'attach')
  }, [openGallery, location])

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

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base">
      <AgentRail className="hidden md:flex h-full" />
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 self-start text-luna-fg-3 hover:text-luna-fg transition-colors"
            aria-label="Back to globe"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <Eyebrow as="span">Locations</Eyebrow>
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

            <ImageryStrip images={images} onRemove={handleRemoveImage} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <Button type="button" variant="outline" onClick={handleOpenGallery}>
                <ImagePlus size={14} strokeWidth={1.5} aria-hidden="true" />
                Attach imagery
              </Button>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="hidden md:inline font-mono text-[11px] tracking-[0.04em] text-luna-fg-4">
                  ⌘↵ to analyze
                </span>
                <Button onClick={handleSubmit} className="w-full md:w-auto">
                  Analyze location
                  <ArrowRight size={14} strokeWidth={1.5} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <SuggestedQuestions
            questions={location.suggestedQuestions ?? []}
            onSelect={handleTemplateSelect}
          />
        </div>
      </main>
    </div>
  )
}
