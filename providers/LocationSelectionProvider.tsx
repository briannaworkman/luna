'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageGalleryDialog } from '@/components/gallery/ImageGalleryDialog'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

type GalleryIntent = 'navigate' | 'attach'

interface LocationSelectionState {
  selectedImages: NasaImage[]
  setSelectedImages: (images: NasaImage[]) => void
  galleryLocation: LunarLocation | null
  galleryOpen: boolean
  openGallery: (location: LunarLocation, intent?: GalleryIntent) => void
  closeGallery: () => void
}

const LocationSelectionContext = createContext<LocationSelectionState | null>(null)

export function LocationSelectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [selectedImages, setSelectedImages] = useState<NasaImage[]>([])
  const [galleryLocation, setGalleryLocation] = useState<LunarLocation | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [intent, setIntent] = useState<GalleryIntent>('navigate')

  const openGallery = useCallback((location: LunarLocation, gIntent: GalleryIntent = 'navigate') => {
    setGalleryLocation(location)
    setIntent(gIntent)
    // Clear stale picks only when entering from the globe; preserve on attach
    if (gIntent === 'navigate') setSelectedImages([])
    setGalleryOpen(true)
  }, [])

  const closeGallery = useCallback(() => {
    setGalleryOpen(false)
  }, [])

  const handleContinue = useCallback(
    (location: LunarLocation, images: NasaImage[]) => {
      setSelectedImages(images)
      setGalleryOpen(false)
      if (intent === 'navigate') {
        router.push(`/locations/${location.id}/query`)
      }
    },
    [intent, router],
  )

  const value = useMemo<LocationSelectionState>(
    () => ({
      selectedImages,
      setSelectedImages,
      galleryLocation,
      galleryOpen,
      openGallery,
      closeGallery,
    }),
    [selectedImages, galleryLocation, galleryOpen, openGallery, closeGallery],
  )

  return (
    <LocationSelectionContext.Provider value={value}>
      {children}
      <ImageGalleryDialog
        location={galleryLocation}
        open={galleryOpen}
        defaultSelectedImages={selectedImages}
        onClose={closeGallery}
        onContinue={handleContinue}
      />
    </LocationSelectionContext.Provider>
  )
}

export function useLocationSelection(): LocationSelectionState {
  const ctx = useContext(LocationSelectionContext)
  if (!ctx) throw new Error('useLocationSelection must be used inside LocationSelectionProvider')
  return ctx
}

export function useSelectedImages(): [NasaImage[], (images: NasaImage[]) => void] {
  const { selectedImages, setSelectedImages } = useLocationSelection()
  return [selectedImages, setSelectedImages]
}

export function useOpenGallery() {
  return useLocationSelection().openGallery
}
