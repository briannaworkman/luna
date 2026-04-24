'use client'
import { useState, useCallback } from 'react'
import { QueryComposer, type QueryPayload } from '@/components/screen2/QueryComposer'
import { AgentStreamView } from '@/components/screen3/AgentStreamView'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'

type Phase =
  | { name: 'compose' }
  | { name: 'stream'; query: string; images: NasaImage[] }

export function QueryPageClient({ location }: { location: LunarLocation }) {
  const [phase, setPhase] = useState<Phase>({ name: 'compose' })

  const handleSubmit = useCallback((payload: QueryPayload) => {
    setPhase({ name: 'stream', query: payload.query, images: payload.images })
  }, [])

  const handleReset = useCallback(() => setPhase({ name: 'compose' }), [])

  if (phase.name === 'stream') {
    return (
      <AgentStreamView
        location={location}
        query={phase.query}
        images={phase.images}
        onReset={handleReset}
      />
    )
  }

  return <QueryComposer location={location} onSubmit={handleSubmit} />
}
