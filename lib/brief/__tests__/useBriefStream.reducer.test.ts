import { describe, it, expect } from 'vitest'
import {
  briefStreamReducer,
  initialBriefStreamState,
  type BriefStreamState,
  type BriefStreamAction,
} from '../../hooks/useBriefStream'
import type { MissionBrief } from '@/lib/types/brief'

const mockBrief: MissionBrief = {
  locationName: 'Tycho',
  query: 'What minerals are here?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  summary: 'Tycho is a young impact crater.',
  sections: [],
  followUpQueries: ['Q1?', 'Q2?', 'Q3?'],
  dataCompleteness: {
    'LROC NAC': 'Confirmed',
    'LROC WAC': 'Confirmed',
    'JSC Samples': 'Partial',
    'SVS Illumination': 'Confirmed',
    'NASA Image Library': 'Confirmed',
  },
}

function reduce(
  state: BriefStreamState,
  action: BriefStreamAction,
): BriefStreamState {
  return briefStreamReducer(state, action)
}

describe('briefStreamReducer', () => {
  it('initial state has idle status', () => {
    expect(initialBriefStreamState.status).toBe('idle')
    expect(initialBriefStreamState.brief).toBeNull()
    expect(initialBriefStreamState.error).toBeNull()
  })

  it('start action transitions to loading and clears prior state', () => {
    const dirty: BriefStreamState = {
      ...initialBriefStreamState,
      status: 'complete',
      brief: mockBrief,
      error: 'old error',
    }
    const next = reduce(dirty, { kind: 'start' })
    expect(next.status).toBe('loading')
    expect(next.brief).toBeNull()
    expect(next.error).toBeNull()
    expect(next.rawText).toBe('')
    expect(next.partial).toBeNull()
  })

  it('partial action accumulates rawText and sets status to partial', () => {
    const loading: BriefStreamState = { ...initialBriefStreamState, status: 'loading' }
    const next = reduce(loading, { kind: 'partial', text: '{"locationName":"Ty' })
    expect(next.status).toBe('partial')
    expect(next.rawText).toBe('{"locationName":"Ty')
  })

  it('multiple partial actions accumulate raw text', () => {
    let state: BriefStreamState = { ...initialBriefStreamState, status: 'loading' }
    state = reduce(state, { kind: 'partial', text: '{"location' })
    state = reduce(state, { kind: 'partial', text: 'Name":"Tycho"}' })
    expect(state.rawText).toBe('{"locationName":"Tycho"}')
  })

  it('complete action sets brief and clears partial', () => {
    const partialState: BriefStreamState = {
      ...initialBriefStreamState,
      status: 'partial',
      rawText: '{partial}',
      partial: { locationName: 'Ty' },
    }
    const next = reduce(partialState, { kind: 'complete', brief: mockBrief })
    expect(next.status).toBe('complete')
    expect(next.brief).toEqual(mockBrief)
    expect(next.partial).toBeNull()
    expect(next.rawText).toBe('')
    expect(next.error).toBeNull()
  })

  it('error action sets error status and message', () => {
    const loading: BriefStreamState = { ...initialBriefStreamState, status: 'loading' }
    const next = reduce(loading, {
      kind: 'error',
      message: 'Synthesis failed',
      partial: undefined,
    })
    expect(next.status).toBe('error')
    expect(next.error).toBe('Synthesis failed')
    expect(next.brief).toBeNull()
  })

  it('error action with partial preserves partial brief', () => {
    const state: BriefStreamState = {
      ...initialBriefStreamState,
      status: 'partial',
      partial: { locationName: 'Tycho', summary: 'partial summary' },
    }
    const next = reduce(state, {
      kind: 'error',
      message: 'Stream interrupted',
      partial: { locationName: 'Tycho', summary: 'partial summary' },
    })
    expect(next.status).toBe('error')
    expect(next.partial).toEqual({ locationName: 'Tycho', summary: 'partial summary' })
  })

  it('error action without explicit partial falls back to existing state partial', () => {
    const existingPartial = { locationName: 'Shackleton' }
    const state: BriefStreamState = {
      ...initialBriefStreamState,
      status: 'partial',
      partial: existingPartial,
    }
    const next = reduce(state, {
      kind: 'error',
      message: 'Error',
      partial: undefined,
    })
    expect(next.partial).toEqual(existingPartial)
  })

  it('reset action returns to initial state', () => {
    const dirty: BriefStreamState = {
      ...initialBriefStreamState,
      status: 'complete',
      brief: mockBrief,
      rawText: 'some text',
    }
    const next = reduce(dirty, { kind: 'reset' })
    expect(next).toEqual(initialBriefStreamState)
  })
})
