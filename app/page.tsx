'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import { ImageGalleryDialog } from '@/components/gallery/ImageGalleryDialog'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

// Three.js creates a WebGL context — must be client-only, no SSR
const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LunarLocation | null>(null)
  const [galleryLocation, setGalleryLocation] = useState<LunarLocation | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<NasaImage[]>([])
  const deselectRef = useRef<(() => void) | null>(null)

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
    setGalleryOpen(false)
    // TODO: navigate to Screen 2 (Query Input)
  }, [])

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
