'use client'
import { useReducer, useEffect } from 'react'
import type { LunarLocation } from '@/components/globe/types'
import type { AgentId } from '@/lib/constants/agents'
import type { OrchestratorEvent } from '@/lib/types/agent'
import { parseSseStream } from './parseSseStream'

export interface SingleAgentState {
  status: 'idle' | 'active' | 'complete' | 'error'
  text: string
  citations: Array<{ source: 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'; id: string }>
  confidence: Array<{ level: 'high' | 'medium' | 'low'; claimId?: string }>
  statusText?: string
  errorMessage?: string
}

export interface AgentStreamState {
  preflight: string
  activatedAgents: AgentId[]
  rationale: string
  agentStates: Partial<Record<AgentId, SingleAgentState>>
  isDone: boolean
  streamError?: string
}

export type AgentStreamAction =
  | { kind: 'sse'; event: OrchestratorEvent }
  | { kind: 'stream-error'; message: string }

export const initialAgentStreamState: AgentStreamState = {
  preflight: '',
  activatedAgents: [],
  rationale: '',
  agentStates: {},
  isDone: false,
}

function makeDefaultAgentState(): SingleAgentState {
  return { status: 'active', text: '', citations: [], confidence: [] }
}

function upsertAgent(
  agentStates: Partial<Record<AgentId, SingleAgentState>>,
  agentId: AgentId,
  updater: (prev: SingleAgentState) => SingleAgentState,
): Partial<Record<AgentId, SingleAgentState>> {
  const prev = agentStates[agentId] ?? makeDefaultAgentState()
  return { ...agentStates, [agentId]: updater(prev) }
}

export function agentStreamReducer(
  state: AgentStreamState,
  action: AgentStreamAction,
): AgentStreamState {
  if (action.kind === 'stream-error') {
    return { ...state, streamError: action.message }
  }

  const { event } = action

  switch (event.type) {
    case 'orchestrator-chunk':
      return { ...state, preflight: state.preflight + event.text }

    case 'orchestrator':
      return {
        ...state,
        activatedAgents: event.agents,
        rationale: event.rationale,
      }

    case 'agent-activate': {
      const existing = state.agentStates[event.agent]
      const updated: SingleAgentState = existing
        ? { ...existing, status: 'active' }
        : { status: 'active', text: '', citations: [], confidence: [] }
      return {
        ...state,
        agentStates: { ...state.agentStates, [event.agent]: updated },
      }
    }

    case 'agent-status':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          statusText: event.text,
        })),
      }

    case 'agent-chunk':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          text: prev.text + event.text,
        })),
      }

    case 'agent-citation':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          citations: [...prev.citations, { source: event.source, id: event.id }],
        })),
      }

    case 'agent-confidence':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          confidence: [
            ...prev.confidence,
            { level: event.level, claimId: event.claimId },
          ],
        })),
      }

    case 'agent-complete':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          status: 'complete',
          statusText: undefined,
        })),
      }

    case 'agent-error':
      return {
        ...state,
        agentStates: upsertAgent(state.agentStates, event.agent, (prev) => ({
          ...prev,
          status: 'error',
          errorMessage: event.message,
        })),
      }

    case 'done':
      return { ...state, isDone: true }

    default:
      return state
  }
}

export function useAgentStream(input: {
  location: LunarLocation
  query: string
  imageAssetIds: string[]
}): AgentStreamState {
  const [state, dispatch] = useReducer(agentStreamReducer, initialAgentStreamState)

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      let response: Response
      try {
        response = await fetch('/api/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: input.query,
            locationId: input.location.id,
            imageAssetIds: input.imageAssetIds,
          }),
          signal: controller.signal,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        dispatch({
          kind: 'stream-error',
          message: err instanceof Error ? err.message : 'Network error',
        })
        return
      }

      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const body = await response.json()
          if (typeof body === 'object' && body !== null && 'error' in body) {
            message = String((body as Record<string, unknown>)['error'])
          }
        } catch {
          // ignore
        }
        dispatch({ kind: 'stream-error', message })
        return
      }

      if (!response.body) {
        dispatch({ kind: 'stream-error', message: 'Response body is null' })
        return
      }

      try {
        for await (const ev of parseSseStream(response.body)) {
          if (controller.signal.aborted) break
          dispatch({ kind: 'sse', event: ev })
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        dispatch({
          kind: 'stream-error',
          message: err instanceof Error ? err.message : 'Stream error',
        })
      }
    }

    run()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.location.id, input.query, JSON.stringify(input.imageAssetIds)])

  return state
}
