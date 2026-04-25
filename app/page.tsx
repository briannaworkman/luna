'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import { useOpenGallery } from '@/providers/LocationSelectionProvider'
import type { LunarLocation } from '@/components/globe/types'
import { FilterBar } from '@/components/screen1/FilterBar'
import { ViewToggle, type ViewMode } from '@/components/screen1/ViewToggle'
import { LocationListView } from '@/components/screen1/LocationListView'
import { filterLocations, type LocationFilter } from '@/components/screen1/filterLocations'
import { LOCATIONS } from '@/components/globe/locations'

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
      className="fixed top-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded bg-luna-base-2 border border-luna-hairline font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan shadow-lg"
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

  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<LocationFilter>('all')

  const filteredLocations = useMemo(
    () => filterLocations(LOCATIONS, filter),
    [filter],
  )

  const handleLocationSelect = useCallback((location: LunarLocation | null) => {
    setSelectedLocation(location)
  }, [])

  const handlePanelClose = useCallback(() => {
    deselectRef.current?.()
    setSelectedLocation(null)
  }, [])

  const handleOpenGallery = useCallback(
    (location: LunarLocation) => {
      openGallery(location, 'navigate')
    },
    [openGallery],
  )

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView)
    if (newView === 'list') {
      deselectRef.current?.()
      setSelectedLocation(null)
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <HintBanner />
      </Suspense>
      <main className="fixed inset-x-0 bottom-0 top-14 flex flex-col bg-luna-base">
        {/* Control strip: filters left, view toggle right */}
        <div className="flex items-center gap-3 px-8 py-2.5 border-b border-luna-hairline flex-shrink-0">
          <FilterBar activeFilter={filter} onFilterChange={setFilter} />
          <ViewToggle activeView={view} onViewChange={handleViewChange} />
        </div>

        {view === 'list' ? (
          <LocationListView
            locations={filteredLocations}
            onLocationSelect={handleOpenGallery}
          />
        ) : (
          <div className="flex-1 relative">
            <LunarGlobe
              locations={filteredLocations}
              onLocationSelect={handleLocationSelect}
              deselectRef={deselectRef}
            />
            <LocationPanel
              location={selectedLocation}
              onClose={handlePanelClose}
              onResearch={handleOpenGallery}
            />
          </div>
        )}
      </main>
    </>
  )
}
