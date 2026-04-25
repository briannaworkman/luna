'use client'
import { useReducer, useCallback } from 'react'
import type { MissionBrief } from '@/lib/types/brief'
import { parseBriefStream } from '@/lib/brief/parseBriefStream'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface BriefStreamState {
  status: 'idle' | 'loading' | 'partial' | 'complete' | 'error'
  brief: MissionBrief | null
  partial: Partial<MissionBrief> | null
  /** Accumulated raw text (for partial JSON parsing) */
  rawText: string
  error: string | null
}

export const initialBriefStreamState: BriefStreamState = {
  status: 'idle',
  brief: null,
  partial: null,
  rawText: '',
  error: null,
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type BriefStreamAction =
  | { kind: 'start' }
  | { kind: 'partial'; text: string }
  | { kind: 'complete'; brief: MissionBrief }
  | { kind: 'error'; message: string; partial: Partial<MissionBrief> | undefined }
  | { kind: 'reset' }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function briefStreamReducer(
  state: BriefStreamState,
  action: BriefStreamAction,
): BriefStreamState {
  switch (action.kind) {
    case 'start':
      return {
        ...initialBriefStreamState,
        status: 'loading',
      }

    case 'partial': {
      const rawText = state.rawText + action.text
      // Attempt to extract a usable partial object from the accumulated JSON
      const partial = tryParsePartial(rawText)
      return {
        ...state,
        status: 'partial',
        rawText,
        partial,
      }
    }

    case 'complete':
      return {
        ...state,
        status: 'complete',
        brief: action.brief,
        partial: null,
        rawText: '',
        error: null,
      }

    case 'error':
      return {
        ...state,
        status: 'error',
        error: action.message,
        partial: action.partial ?? state.partial,
        brief: null,
      }

    case 'reset':
      return initialBriefStreamState

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Partial parser — best-effort; returns null on failure
// ---------------------------------------------------------------------------

function tryParsePartial(text: string): Partial<MissionBrief> | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as Partial<MissionBrief>
  } catch {
    // Try to parse what we have so far by closing the JSON object
    // This is best-effort; we just return null on failure
    return null
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface BriefStreamInput {
  query: string
  locationId: string
  agentOutputs: Record<string, string>
  activeAgents: string[]
}

export function useBriefStream(): [
  BriefStreamState,
  (input: BriefStreamInput) => void,
] {
  const [state, dispatch] = useReducer(briefStreamReducer, initialBriefStreamState)

  const start = useCallback((input: BriefStreamInput) => {
    dispatch({ kind: 'start' })

    async function run() {
      let response: Response
      try {
        response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
      } catch (err) {
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Network error',
          partial: undefined,
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
        dispatch({ kind: 'error', message, partial: undefined })
        return
      }

      if (!response.body) {
        dispatch({ kind: 'error', message: 'Response body is null', partial: undefined })
        return
      }

      try {
        for await (const ev of parseBriefStream(response.body)) {
          switch (ev.type) {
            case 'partial':
              dispatch({ kind: 'partial', text: ev.text })
              break
            case 'complete':
              dispatch({ kind: 'complete', brief: ev.brief })
              break
            case 'error':
              dispatch({ kind: 'error', message: ev.message, partial: ev.partial })
              break
          }
        }
      } catch (err) {
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Stream error',
          partial: undefined,
        })
      }
    }

    run()
  }, [])

  return [state, start]
}
