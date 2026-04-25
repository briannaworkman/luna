'use client'
import { useState, useCallback, useEffect } from 'react'
import { QueryComposer, type QueryPayload } from '@/components/screen2/QueryComposer'
import { AgentStreamView } from '@/components/screen3/AgentStreamView'
import { BriefView } from '@/components/screen4/BriefView'
import { useAgentStream } from '@/components/screen3/useAgentStream'
import { buildSynthesisInput } from '@/lib/brief/buildSynthesisInput'
import { useBriefStream } from '@/lib/hooks/useBriefStream'
import type { LunarLocation } from '@/components/globe/types'
import type { NasaImage } from '@/lib/types/nasa'
import type { AgentId } from '@/lib/constants/agents'
import type { ResolvedCitation } from '@/lib/citations/types'

type Phase =
  | { name: 'compose'; prefillQuery?: string }
  | { name: 'stream'; query: string; images: NasaImage[] }
  | {
      name: 'brief'
      query: string
      locationId: string
      images: NasaImage[]
      agentOutputs: Partial<Record<AgentId, string>>
      activationOrder: readonly AgentId[]
      globalCitations: ResolvedCitation[]
    }

export function QueryPageClient({ location }: { location: LunarLocation }) {
  const [phase, setPhase] = useState<Phase>({ name: 'compose' })

  const handleSubmit = useCallback((payload: QueryPayload) => {
    setPhase({ name: 'stream', query: payload.query, images: payload.images })
  }, [])

  const handleReset = useCallback(() => setPhase({ name: 'compose' }), [])

  const handleFollowUp = useCallback((question: string) => {
    setPhase({ name: 'compose', prefillQuery: question })
  }, [])

  if (phase.name === 'brief') {
    return (
      <BriefPhaseView
        phase={phase}
        onFollowUp={handleFollowUp}
        onReset={handleReset}
      />
    )
  }

  if (phase.name === 'stream') {
    return (
      <StreamPhaseView
        location={location}
        query={phase.query}
        images={phase.images}
        onReset={handleReset}
        onGenerateBrief={(agentOutputs, activationOrder, globalCitations) => {
          setPhase({
            name: 'brief',
            query: phase.query,
            locationId: location.id,
            images: phase.images,
            agentOutputs,
            activationOrder,
            globalCitations,
          })
        }}
      />
    )
  }

  return (
    <QueryComposer
      location={location}
      onSubmit={handleSubmit}
      initialQuery={phase.prefillQuery}
    />
  )
}

// ---------------------------------------------------------------------------
// StreamPhaseView — owns the agent stream state and exposes it upward
// ---------------------------------------------------------------------------

interface StreamPhaseViewProps {
  location: LunarLocation
  query: string
  images: NasaImage[]
  onReset: () => void
  onGenerateBrief: (
    agentOutputs: Partial<Record<AgentId, string>>,
    activationOrder: readonly AgentId[],
    globalCitations: ResolvedCitation[],
  ) => void
}

function StreamPhaseView({
  location,
  query,
  images,
  onReset,
  onGenerateBrief,
}: StreamPhaseViewProps) {
  const imageAssetIds = images.map((img) => img.assetId)
  const state = useAgentStream({ location, query, imageAssetIds })

  const { agentStates, activatedAgents, globalCitations } = state
  const handleGenerateBrief = useCallback(() => {
    const agentOutputs = buildSynthesisInput(agentStates, activatedAgents)
    onGenerateBrief(agentOutputs, activatedAgents, globalCitations)
  }, [agentStates, activatedAgents, globalCitations, onGenerateBrief])

  return (
    <AgentStreamView
      location={location}
      query={query}
      onReset={onReset}
      onGenerateBrief={handleGenerateBrief}
      state={state}
    />
  )
}

// ---------------------------------------------------------------------------
// BriefPhaseView — owns brief stream state
// ---------------------------------------------------------------------------

interface BriefPhasePayload {
  name: 'brief'
  query: string
  locationId: string
  images: NasaImage[]
  agentOutputs: Partial<Record<AgentId, string>>
  activationOrder: readonly AgentId[]
  globalCitations: ResolvedCitation[]
}

interface BriefPhaseViewProps {
  phase: BriefPhasePayload
  onFollowUp: (question: string) => void
  onReset: () => void
}

function BriefPhaseView({ phase, onFollowUp, onReset }: BriefPhaseViewProps) {
  const [briefState, startBrief] = useBriefStream()

  // Start once on mount. The user clicked "Generate mission brief" to get here;
  // the phase payload is captured at click time and is stable for this view's
  // lifetime, so an empty deps array is correct.
  useEffect(() => {
    startBrief({
      query: phase.query,
      locationId: phase.locationId,
      agentOutputs: phase.agentOutputs,
      activeAgents: phase.activationOrder,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BriefView
      briefState={briefState}
      activationOrder={phase.activationOrder}
      globalCitations={phase.globalCitations}
      onFollowUp={onFollowUp}
      onReset={onReset}
    />
  )
}
