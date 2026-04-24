import type { AgentId } from '@/lib/constants/agents'
import type { NasaImage, LrocProduct, JscSample, IlluminationWindow } from '@/lib/types/nasa'

export type { NasaImage, LrocProduct, JscSample, IlluminationWindow }

export interface DataContext {
  location: {
    name: string
    lat: number
    lon: number
    diameterKm: number | null
    significanceNote: string
    isProposed: boolean
  }
  nasaImages: NasaImage[] | null
  lrocProducts: LrocProduct[] | null
  jscSamples: JscSample[] | null
  illuminationWindows: IlluminationWindow[] | null
}

export interface OrchestratorActivateEvent {
  type: 'orchestrator'
  agents: AgentId[]
  rationale: string
}

export interface OrchestratorChunkEvent {
  type: 'orchestrator-chunk'
  text: string
}

export interface AgentActivateEvent {
  type: 'agent-activate'
  agent: AgentId
}

export interface AgentChunkEvent {
  type: 'agent-chunk'
  agent: AgentId
  text: string
}

export interface AgentCitationEvent {
  type: 'agent-citation'
  agent: AgentId
  source: 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'
  id: string
}

export interface AgentConfidenceEvent {
  type: 'agent-confidence'
  agent: AgentId
  level: 'high' | 'medium' | 'low'
  claimId?: string
}

export interface AgentCompleteEvent {
  type: 'agent-complete'
  agent: AgentId
}

export interface AgentErrorEvent {
  type: 'agent-error'
  agent: AgentId
  message: string
}

export interface DoneEvent {
  type: 'done'
}

export type OrchestratorEvent =
  | OrchestratorActivateEvent
  | OrchestratorChunkEvent
  | AgentActivateEvent
  | AgentChunkEvent
  | AgentCitationEvent
  | AgentConfidenceEvent
  | AgentCompleteEvent
  | AgentErrorEvent
  | DoneEvent
