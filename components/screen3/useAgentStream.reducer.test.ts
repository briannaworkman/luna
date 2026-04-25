import { describe, it, expect } from 'vitest'
import {
  agentStreamReducer,
  initialAgentStreamState,
  type AgentStreamState,
  type BodySegment,
} from './useAgentStream'

describe('agentStreamReducer', () => {
  it('orchestrator-chunk appends text to preflight', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'orchestrator-chunk', text: 'Hello ' },
    })
    const state2 = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'orchestrator-chunk', text: 'world' },
    })
    expect(state2.preflight).toBe('Hello world')
  })

  it('orchestrator sets activatedAgents and rationale', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: {
        type: 'orchestrator',
        agents: ['imagery', 'orbit'],
        rationale: 'Because reasons',
      },
    })
    expect(state.activatedAgents).toEqual(['imagery', 'orbit'])
    expect(state.rationale).toBe('Because reasons')
  })

  it('agent-activate creates fresh active entry with empty body and citations', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'imagery' },
    })
    expect(state.agentStates['imagery']).toEqual({
      status: 'active',
      body: [],
      citations: [],
      chunkCount: 0,
    })
  })

  it('agent-activate resets to fresh state even if existing body/citations were present', () => {
    const withChunk = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'imagery', text: 'some data' },
    })
    // Verify chunk was applied
    expect(withChunk.agentStates['imagery']?.body).toHaveLength(1)

    const state = agentStreamReducer(withChunk, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'imagery' },
    })
    expect(state.agentStates['imagery']?.status).toBe('active')
    expect(state.agentStates['imagery']?.body).toEqual([])
    expect(state.agentStates['imagery']?.citations).toEqual([])
  })

  it('agent-status upserts statusText', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-status', agent: 'orbit', text: 'Fetching ephemeris...' },
    })
    expect(state.agentStates['orbit']?.statusText).toBe('Fetching ephemeris...')
  })

  it('agent-chunk appends text segment to body', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Part 1 ' },
    })
    expect(s1.agentStates['mineralogy']?.body).toEqual([
      { kind: 'text', text: 'Part 1 ' },
    ])
  })

  it('consecutive agent-chunks merge into a single text segment', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Part 1 ' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Part 2' },
    })
    expect(s2.agentStates['mineralogy']?.body).toEqual([
      { kind: 'text', text: 'Part 1 Part 2' },
    ])
  })

  it('agent-confidence pushes confidence segment into body (does not merge with text)', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: 'Strong claim.' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'orbit', level: 'high' },
    })
    expect(s2.agentStates['orbit']?.body).toEqual([
      { kind: 'text', text: 'Strong claim.' },
      { kind: 'confidence', level: 'high' },
    ])
  })

  it('agent-chunk after confidence pushes new text segment (no merge with confidence)', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'orbit', level: 'medium' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: ' After badge.' },
    })
    const body = s2.agentStates['orbit']?.body ?? []
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({ kind: 'confidence', level: 'medium' })
    expect(body[1]).toEqual({ kind: 'text', text: ' After badge.' })
  })

  it('body segment ordering: text → confidence → text', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Before ' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'mineralogy', level: 'high' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'After' },
    })
    const body: BodySegment[] = state.agentStates['mineralogy']?.body ?? []
    expect(body).toEqual([
      { kind: 'text', text: 'Before ' },
      { kind: 'confidence', level: 'high' },
      { kind: 'text', text: 'After' },
    ])
  })

  it('body segment ordering: multiple confidence badges not merged', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'mineralogy', level: 'high' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'mineralogy', level: 'low' },
    })
    const body: BodySegment[] = state.agentStates['mineralogy']?.body ?? []
    expect(body).toEqual([
      { kind: 'confidence', level: 'high' },
      { kind: 'confidence', level: 'low' },
    ])
  })

  it('agent-citation pushes to citations array', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'lroc', id: 'LROC_001' },
    })
    expect(state.agentStates['imagery']?.citations).toEqual([
      { source: 'lroc', id: 'LROC_001' },
    ])
  })

  it('agent-citation does not affect body segments', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'imagery', text: 'Some text.' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA001' },
    })
    expect(state.agentStates['imagery']?.body).toEqual([
      { kind: 'text', text: 'Some text.' },
    ])
    expect(state.agentStates['imagery']?.citations).toEqual([
      { source: 'nasa-image', id: 'PIA001' },
    ])
  })

  it('agent-complete sets status to complete and clears statusText', () => {
    const withStatus: AgentStreamState = {
      ...initialAgentStreamState,
      agentStates: {
        imagery: {
          status: 'active',
          body: [{ kind: 'text', text: 'done text' }],
          citations: [],
          chunkCount: 0,
          statusText: 'Still working...',
        },
      },
    }
    const state = agentStreamReducer(withStatus, {
      kind: 'sse',
      event: { type: 'agent-complete', agent: 'imagery' },
    })
    expect(state.agentStates['imagery']?.status).toBe('complete')
    expect(state.agentStates['imagery']?.statusText).toBeUndefined()
    // body preserved
    expect(state.agentStates['imagery']?.body).toEqual([{ kind: 'text', text: 'done text' }])
  })

  it('agent-error sets status to error with errorMessage', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-error', agent: 'thermal', message: 'Timeout' },
    })
    expect(state.agentStates['thermal']?.status).toBe('error')
    expect(state.agentStates['thermal']?.errorMessage).toBe('Timeout')
  })

  it('done sets isDone to true', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'done' },
    })
    expect(state.isDone).toBe(true)
  })

  it('stream-error sets streamError message', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'stream-error',
      message: 'Network failure',
    })
    expect(state.streamError).toBe('Network failure')
  })

  it('agent-chunk increments chunkCount', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'orbit' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: 'a' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: 'b' },
    })
    expect(state.agentStates['orbit']?.chunkCount).toBe(2)
  })

  it('agent-complete preserves chunkCount', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'orbit' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: 'a' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-complete', agent: 'orbit' },
    })
    expect(state.agentStates['orbit']?.chunkCount).toBe(1)
    expect(state.agentStates['orbit']?.status).toBe('complete')
  })

  it('agent-activate initializes chunkCount to 0', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'mineralogy' },
    })
    expect(state.agentStates['mineralogy']?.chunkCount).toBe(0)
  })

  it('agent-activate resets chunkCount when re-activating after complete', () => {
    let state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'orbit' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'orbit', text: 'a' },
    })
    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-complete', agent: 'orbit' },
    })
    expect(state.agentStates['orbit']?.chunkCount).toBe(1)

    state = agentStreamReducer(state, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'orbit' },
    })
    expect(state.agentStates['orbit']?.chunkCount).toBe(0)
  })
})

describe('agent-citation — global dedup', () => {
  it('first citation appends one entry with correct source, id, and url', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA12345' },
    })
    expect(state.globalCitations).toHaveLength(1)
    expect(state.globalCitations[0]!.source).toBe('nasa-image')
    expect(state.globalCitations[0]!.id).toBe('PIA12345')
    expect(state.globalCitations[0]!.url).toBe('https://images.nasa.gov/details/PIA12345')
  })

  it('duplicate source:id from same agent does not add to globalCitations but does add to per-agent citations', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA12345' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA12345' },
    })
    expect(s2.globalCitations).toHaveLength(1)
    expect(s2.agentStates['imagery']?.citations).toHaveLength(2)
  })

  it('same source:id from different agent still results in one globalCitations entry', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA12345' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'mission-history', source: 'nasa-image', id: 'PIA12345' },
    })
    expect(s2.globalCitations).toHaveLength(1)
  })

  it('lroc citation entry has url === null', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'lroc', id: 'M1234567890LE' },
    })
    expect(state.globalCitations).toHaveLength(1)
    expect(state.globalCitations[0]!.url).toBeNull()
  })

  it('dedupes case-insensitively on id (PIA12345 vs pia12345)', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'PIA12345' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'imagery', source: 'nasa-image', id: 'pia12345' },
    })
    expect(s2.globalCitations).toHaveLength(1)
    expect(s2.globalCitations[0]!.id).toBe('PIA12345')
  })

  it('svs with SVS- prefix url matches expected pattern', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-citation', agent: 'orbit', source: 'svs', id: 'SVS-5587' },
    })
    expect(state.globalCitations[0]!.url).toBe('https://svs.gsfc.nasa.gov/5587')
  })
})
