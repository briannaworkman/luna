import { describe, it, expect } from 'vitest'
import {
  agentStreamReducer,
  initialAgentStreamState,
  type AgentStreamState,
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

  it('agent-activate creates active entry with empty text/citations/confidence', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'imagery' },
    })
    expect(state.agentStates['imagery']).toEqual({
      status: 'active',
      text: '',
      citations: [],
      confidence: [],
    })
  })

  it('agent-activate on existing entry flips status but keeps text/citations/confidence', () => {
    const withChunk = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'imagery', text: 'some data' },
    })
    const state = agentStreamReducer(withChunk, {
      kind: 'sse',
      event: { type: 'agent-activate', agent: 'imagery' },
    })
    expect(state.agentStates['imagery']?.status).toBe('active')
    expect(state.agentStates['imagery']?.text).toBe('some data')
  })

  it('agent-status upserts statusText', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-status', agent: 'orbit', text: 'Fetching ephemeris...' },
    })
    expect(state.agentStates['orbit']?.statusText).toBe('Fetching ephemeris...')
  })

  it('agent-chunk appends text to agent state', () => {
    const s1 = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Part 1 ' },
    })
    const s2 = agentStreamReducer(s1, {
      kind: 'sse',
      event: { type: 'agent-chunk', agent: 'mineralogy', text: 'Part 2' },
    })
    expect(s2.agentStates['mineralogy']?.text).toBe('Part 1 Part 2')
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

  it('agent-confidence pushes to confidence array', () => {
    const state = agentStreamReducer(initialAgentStreamState, {
      kind: 'sse',
      event: { type: 'agent-confidence', agent: 'orbit', level: 'high', claimId: 'c1' },
    })
    expect(state.agentStates['orbit']?.confidence).toEqual([
      { level: 'high', claimId: 'c1' },
    ])
  })

  it('agent-complete sets status to complete and clears statusText', () => {
    const withStatus: AgentStreamState = {
      ...initialAgentStreamState,
      agentStates: {
        imagery: {
          status: 'active',
          text: 'done text',
          citations: [],
          confidence: [],
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
})
