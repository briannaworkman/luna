'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import type { LunarLocation } from '@/components/globe/types'

// Three.js creates a WebGL context — must be client-only, no SSR
const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LunarLocation | null>(null)
  const deselectRef = useRef<(() => void) | null>(null)

  const handleLocationSelect = useCallback((location: LunarLocation | null) => {
    setSelectedLocation(location)
  }, [])

  const handlePanelClose = useCallback(() => {
    deselectRef.current?.()
    setSelectedLocation(null)
  }, [])

  const handleResearch = useCallback((_location: LunarLocation) => {
    // TODO: open image gallery dialog (Screen 1.5)
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
    </main>
  )
}
