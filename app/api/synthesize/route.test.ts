import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { DataContext } from '@/lib/types/agent'
import type { BriefStreamEvent, MissionBrief } from '@/lib/types/brief'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// rateLimitFn controls whether the rate limiter blocks the request.
// By default it returns null (allow). Tests can set it to return a 429.
let rateLimitFn: () => Response | null = () => null

vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: () => () => rateLimitFn(),
}))

vi.mock('@/lib/orchestrator/data-ingest', () => ({
  runDataIngest: vi.fn(),
}))

vi.mock('@/lib/synthesize/completeness', () => ({
  deriveDataCompleteness: vi.fn(),
}))

vi.mock('@/lib/synthesize/run', () => ({
  runSynthesis: vi.fn(),
}))

import { runDataIngest } from '@/lib/orchestrator/data-ingest'
import { deriveDataCompleteness } from '@/lib/synthesize/completeness'
import { runSynthesis } from '@/lib/synthesize/run'
import { POST } from './route'

const mockRunDataIngest = vi.mocked(runDataIngest)
const mockDeriveDataCompleteness = vi.mocked(deriveDataCompleteness)
const mockRunSynthesis = vi.mocked(runSynthesis)

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const fakeDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater',
    isProposed: false,
  },
  nasaImages: [],
  lrocProducts: [],
  jscSamples: [],
  illuminationWindows: [],
}

const fakeCompleteness = {
  'LROC NAC': 'Confirmed' as const,
  'LROC WAC': 'Confirmed' as const,
  'JSC Samples': 'Partial' as const,
  'SVS Illumination': 'Confirmed' as const,
  'NASA Image Library': 'Confirmed' as const,
}

const validBrief: MissionBrief = {
  locationName: 'Tycho',
  query: 'What minerals?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  summary: 'Tycho is a well-studied crater. The mineralogy data shows anorthosite. Orbit data shows good lighting. Mission history is rich. Data is reliable.',
  sections: [
    {
      agentId: 'mineralogy',
      agentName: 'Mineralogy',
      findings: [
        { claim: 'Anorthosite present.', confidence: 'High', corroboratedBy: [], citations: [] },
        { claim: 'Impact melt at rim.', confidence: 'Medium', corroboratedBy: [], citations: [] },
        { claim: 'Possible olivine.', confidence: 'Low', corroboratedBy: [], citations: [] },
      ],
    },
  ],
  followUpQueries: ['Q1?', 'Q2?', 'Q3?'],
  dataCompleteness: {
    'LROC NAC': 'Confirmed',
    'LROC WAC': 'Confirmed',
    'JSC Samples': 'Partial',
    'SVS Illumination': 'Confirmed',
    'NASA Image Library': 'Confirmed',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/synthesize', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = {
  query: 'What minerals exist here?',
  locationId: 'tycho',
  agentOutputs: { mineralogy: 'Mineralogy text.', orbit: 'Orbit text.' },
  activeAgents: ['data-ingest', 'mineralogy', 'orbit'],
}

async function drainSse(res: Response): Promise<BriefStreamEvent[]> {
  if (!res.body) return []
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: BriefStreamEvent[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const dataLine = line.replace(/^data: /, '')
      if (dataLine.trim()) {
        try {
          events.push(JSON.parse(dataLine) as BriefStreamEvent)
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
  return events
}

// ---------------------------------------------------------------------------
// Default mock setup
// ---------------------------------------------------------------------------

async function* makeCompleteSynthesisStream(): AsyncGenerator<BriefStreamEvent> {
  yield { type: 'partial', text: '{"locationName":' }
  yield { type: 'complete', brief: validBrief }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRunDataIngest.mockResolvedValue(fakeDataContext)
  mockDeriveDataCompleteness.mockReturnValue(fakeCompleteness)
  mockRunSynthesis.mockReturnValue(makeCompleteSynthesisStream())
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/synthesize', () => {
  describe('input validation', () => {
    it('returns 400 when query is missing', async () => {
      const res = await POST(makeRequest({ locationId: 'tycho', agentOutputs: {}, activeAgents: [] }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/query/i)
    })

    it('returns 400 when query is empty string', async () => {
      const res = await POST(makeRequest({ ...validBody, query: '' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is whitespace only', async () => {
      const res = await POST(makeRequest({ ...validBody, query: '   ' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query exceeds 2000 chars', async () => {
      const res = await POST(makeRequest({ ...validBody, query: 'a'.repeat(2001) }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/2000/i)
    })

    it('accepts query of exactly 2000 chars', async () => {
      const res = await POST(makeRequest({ ...validBody, query: 'a'.repeat(2000) }))
      expect(res.status).not.toBe(400)
    })

    it('returns 400 when locationId is missing', async () => {
      const { locationId: _, ...rest } = validBody
      const res = await POST(makeRequest(rest))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/locationId/i)
    })

    it('returns 400 when locationId is unknown', async () => {
      const res = await POST(makeRequest({ ...validBody, locationId: 'nonexistent-place-xyz' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/Unknown locationId/i)
    })

    it('returns 400 when agentOutputs is not an object', async () => {
      const res = await POST(makeRequest({ ...validBody, agentOutputs: 'not-an-object' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/agentOutputs/i)
    })

    it('returns 400 when agentOutputs contains non-string values', async () => {
      const res = await POST(makeRequest({ ...validBody, agentOutputs: { mineralogy: 42 } }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when activeAgents is not an array', async () => {
      const res = await POST(makeRequest({ ...validBody, activeAgents: 'mineralogy' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/activeAgents/i)
    })

    it('returns 400 when activeAgents contains non-strings', async () => {
      const res = await POST(makeRequest({ ...validBody, activeAgents: [1, 2] }))
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid JSON body', async () => {
      const req = new NextRequest('http://localhost/api/synthesize', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/Invalid JSON/i)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      const { NextResponse } = await import('next/server')
      rateLimitFn = () => NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      try {
        const res = await POST(makeRequest(validBody))
        expect(res.status).toBe(429)
      } finally {
        rateLimitFn = () => null
      }
    })
  })

  describe('valid request — SSE streaming', () => {
    it('returns text/event-stream content type', async () => {
      const res = await POST(makeRequest(validBody))
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('returns Cache-Control: no-cache, no-transform', async () => {
      const res = await POST(makeRequest(validBody))
      expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    })

    it('calls runDataIngest with the resolved location', async () => {
      const res = await POST(makeRequest(validBody))
      await drainSse(res)
      expect(mockRunDataIngest).toHaveBeenCalledOnce()
      expect(mockRunDataIngest).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({ id: 'tycho', name: 'Tycho' }),
        })
      )
    })

    it('passes dataContext from runDataIngest to deriveDataCompleteness', async () => {
      const res = await POST(makeRequest(validBody))
      await drainSse(res)
      expect(mockDeriveDataCompleteness).toHaveBeenCalledWith(fakeDataContext)
    })

    it('emits SSE events from runSynthesis', async () => {
      const res = await POST(makeRequest(validBody))
      const events = await drainSse(res)
      expect(events.length).toBeGreaterThan(0)
      const completeEvent = events.find((e) => e.type === 'complete')
      expect(completeEvent).toBeDefined()
    })

    it('passes activeAgents and agentOutputs to runSynthesis', async () => {
      const res = await POST(makeRequest(validBody))
      await drainSse(res)
      expect(mockRunSynthesis).toHaveBeenCalledWith(
        expect.objectContaining({
          activeAgents: validBody.activeAgents,
          agentOutputs: validBody.agentOutputs,
        })
      )
    })

    it('passes completeness from deriveDataCompleteness to runSynthesis', async () => {
      const res = await POST(makeRequest(validBody))
      await drainSse(res)
      expect(mockRunSynthesis).toHaveBeenCalledWith(
        expect.objectContaining({
          completeness: fakeCompleteness,
        })
      )
    })
  })

  describe('stub and data-ingest agents are not in the rendered prompt', () => {
    it('still calls runSynthesis even when activeAgents includes stub agents', async () => {
      const body = {
        ...validBody,
        activeAgents: ['data-ingest', 'mineralogy', 'thermal', 'topography', 'hazards'],
        agentOutputs: { mineralogy: 'text' },
      }
      const res = await POST(makeRequest(body))
      await drainSse(res)

      // runSynthesis receives the raw activeAgents — prompt.ts is responsible for filtering
      // What we verify here is that the route doesn't pre-filter before calling runSynthesis
      expect(mockRunSynthesis).toHaveBeenCalledWith(
        expect.objectContaining({
          activeAgents: body.activeAgents,
        })
      )
    })
  })
})
