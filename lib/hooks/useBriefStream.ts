'use client'
import { useReducer, useCallback, useEffect, useRef } from 'react'
import type { MissionBrief } from '@/lib/types/brief'
import type { AgentId } from '@/lib/constants/agents'
import { parseBriefStream } from '@/lib/brief/parseBriefStream'

export interface BriefStreamState {
  status: 'idle' | 'loading' | 'partial' | 'complete' | 'error'
  brief: MissionBrief | null
  partial: Partial<MissionBrief> | null
  error: string | null
  /** Internal accumulator for partial JSON parsing. Not consumed by the UI. */
  rawText: string
}

export const initialBriefStreamState: BriefStreamState = {
  status: 'idle',
  brief: null,
  partial: null,
  error: null,
  rawText: '',
}

const initial = initialBriefStreamState

export type BriefStreamAction =
  | { kind: 'start' }
  | { kind: 'partial'; text: string }
  | { kind: 'complete'; brief: MissionBrief }
  | { kind: 'error'; message: string; partial: Partial<MissionBrief> | undefined }
  | { kind: 'reset' }

export function briefStreamReducer(
  state: BriefStreamState,
  action: BriefStreamAction,
): BriefStreamState {
  switch (action.kind) {
    case 'start':
      return { ...initial, status: 'loading' }

    case 'partial': {
      const rawText = state.rawText + action.text
      // The model streams a single JSON object. JSON.parse only succeeds when
      // the buffer contains a complete object — gate on a `}` suffix to skip
      // an O(n²) parse-every-chunk and let only the final-token attempt land.
      const partial = rawText.trimEnd().endsWith('}') ? tryParsePartial(rawText) : state.partial
      return { ...state, status: 'partial', rawText, partial }
    }

    case 'complete':
      return { ...state, status: 'complete', brief: action.brief, partial: null, rawText: '', error: null }

    case 'error':
      return {
        ...state,
        status: 'error',
        error: action.message,
        partial: action.partial ?? state.partial,
        brief: null,
      }

    case 'reset':
      return initial

    default:
      return state
  }
}

function tryParsePartial(text: string): Partial<MissionBrief> | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as Partial<MissionBrief>
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface BriefStreamInput {
  query: string
  locationId: string
  agentOutputs: Partial<Record<AgentId, string>>
  activeAgents: readonly AgentId[]
}

export function useBriefStream(): [
  BriefStreamState,
  (input: BriefStreamInput) => void,
] {
  const [state, dispatch] = useReducer(briefStreamReducer, initialBriefStreamState)
  const controllerRef = useRef<AbortController | null>(null)

  const start = useCallback((input: BriefStreamInput) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    dispatch({ kind: 'start' })

    async function run() {
      let response: Response
      try {
        response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        })
      } catch (err) {
        if (controller.signal.aborted) return
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Network error',
          partial: undefined,
        })
        return
      }

      if (controller.signal.aborted) return

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
        for await (const ev of parseBriefStream(response.body, controller.signal)) {
          if (controller.signal.aborted) return
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
        if (controller.signal.aborted) return
        dispatch({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Stream error',
          partial: undefined,
        })
      }
    }

    run()
  }, [])

  // Abort any in-flight stream when the hook unmounts.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return [state, start]
}
