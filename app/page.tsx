'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback, useEffect } from 'react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import { ImageGalleryDialog } from '@/components/gallery/ImageGalleryDialog'
import { QueryComposer, type QueryPayload } from '@/components/screen2/QueryComposer'
import { LOCATIONS } from '@/components/globe/locations'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

// Three.js creates a WebGL context — must be client-only, no SSR
const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

type AppScreen = 'globe' | 'query'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('globe')
  const [selectedLocation, setSelectedLocation] = useState<LunarLocation | null>(null)
  const [galleryLocation, setGalleryLocation] = useState<LunarLocation | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<NasaImage[]>([])
  const deselectRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const params = new URLSearchParams(window.location.search)
    const first = LOCATIONS[0] ?? null
    if (params.get('screen') === 'query' && first) {
      setGalleryLocation(first)
      setScreen('query')
    }
  }, [])

  const handleLocationSelect = useCallback((location: LunarLocation | null) => {
    setSelectedLocation(location)
  }, [])

  const handlePanelClose = useCallback(() => {
    deselectRef.current?.()
    setSelectedLocation(null)
  }, [])

  const handleResearch = useCallback((location: LunarLocation) => {
    // Clear prior selections so a dismissed-then-reopened gallery can't
    // leak stale context from an earlier location into Screen 2
    setSelectedImages([])
    setGalleryLocation(location)
    setGalleryOpen(true)
  }, [])

  const handleGalleryClose = useCallback(() => {
    setGalleryOpen(false)
  }, [])

  const handleGalleryContinue = useCallback((location: LunarLocation, images: NasaImage[]) => {
    setSelectedImages(images)
    setGalleryLocation(location)
    setGalleryOpen(false)
    setScreen('query')
  }, [])

  const handleQueryBack = useCallback(() => {
    setScreen('globe')
  }, [])

  const handleQuerySubmit = useCallback((payload: QueryPayload) => {
    // PR 5 will replace this with the orchestrator stream trigger
    console.log('[LUNA] Query submitted:', payload)
  }, [])

  if (screen === 'query' && galleryLocation) {
    return (
      <QueryComposer
        location={galleryLocation}
        defaultImages={selectedImages}
        onBack={handleQueryBack}
        onSubmit={handleQuerySubmit}
      />
    )
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-luna-base">
      <LunarGlobe
        onLocationSelect={handleLocationSelect}
        deselectRef={deselectRef}
      />
      <LocationPanel
        location={selectedLocation}
        onClose={handlePanelClose}
        onResearch={handleResearch}
      />
      <ImageGalleryDialog
        location={galleryLocation}
        open={galleryOpen}
        onClose={handleGalleryClose}
        onContinue={handleGalleryContinue}
      />
    </main>
  )
}
