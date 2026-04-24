'use client'
import { useCallback } from 'react'
import { QueryComposer, type QueryPayload } from '@/components/screen2/QueryComposer'
import type { LunarLocation } from '@/components/globe/types'

export function QueryPageClient({ location }: { location: LunarLocation }) {
  const handleSubmit = useCallback((payload: QueryPayload) => {
    console.log('[LUNA] Query submitted:', payload)
    // PR 5 will replace this with the orchestrator stream trigger
  }, [])

  return <QueryComposer location={location} onSubmit={handleSubmit} />
}
