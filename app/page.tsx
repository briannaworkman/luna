'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import { useOpenGallery } from '@/providers/LocationSelectionProvider'
import type { LunarLocation } from '@/components/globe/types'

const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

const HINT_MESSAGES: Record<string, string> = {
  'select-location': 'Select a location to begin.',
}

function HintBanner() {
  const router = useRouter()
  const search = useSearchParams()
  const hint = search.get('hint')
  const message = hint ? HINT_MESSAGES[hint] : null

  const dismiss = useCallback(() => {
    router.replace('/')
  }, [router])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(dismiss, 4500)
    return () => clearTimeout(t)
  }, [message, dismiss])

  if (!message) return null

  return (
    <div
      role="status"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded bg-luna-base-2 border border-luna-hairline font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan shadow-lg"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="text-luna-fg-3 hover:text-luna-fg transition-colors"
      >
        <X size={12} strokeWidth={1.5} />
      </button>
    </div>
  )
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LunarLocation | null>(null)
  const deselectRef = useRef<(() => void) | null>(null)
  const openGallery = useOpenGallery()

  const handleLocationSelect = useCallback((location: LunarLocation | null) => {
    setSelectedLocation(location)
  }, [])

  const handlePanelClose = useCallback(() => {
    deselectRef.current?.()
    setSelectedLocation(null)
  }, [])

  const handleResearch = useCallback(
    (location: LunarLocation) => {
      openGallery(location, 'navigate')
    },
    [openGallery],
  )

  return (
    <>
      <Suspense fallback={null}>
        <HintBanner />
      </Suspense>
      <main className="fixed inset-0 overflow-hidden bg-luna-base">
        <LunarGlobe onLocationSelect={handleLocationSelect} deselectRef={deselectRef} />
        <LocationPanel
          location={selectedLocation}
          onClose={handlePanelClose}
          onResearch={handleResearch}
        />
      </main>
    </>
  )
}
