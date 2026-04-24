import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { OrchestratorEvent, DataContext } from '@/lib/types/agent'

vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: () => () => null,
}))

vi.mock('@/lib/orchestrator/run', () => ({
  runOrchestrator: vi.fn(),
}))

import { runOrchestrator } from '@/lib/orchestrator/run'
import { POST } from './route'

const mockRunOrchestrator = vi.mocked(runOrchestrator)

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

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/orchestrate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRunOrchestrator.mockResolvedValue({
    agents: ['data-ingest', 'mineralogy'],
    rationale: 'test rationale',
    dataContext: fakeDataContext,
  })
})

describe('POST /api/orchestrate', () => {
  describe('input validation', () => {
    it('returns 400 when query is missing', async () => {
      const res = await POST(makeRequest({ locationId: 'tycho', imageAssetIds: [] }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/query/i)
    })

    it('returns 400 when query is empty string', async () => {
      const res = await POST(makeRequest({ query: '', locationId: 'tycho', imageAssetIds: [] }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is whitespace only', async () => {
      const res = await POST(makeRequest({ query: '   ', locationId: 'tycho', imageAssetIds: [] }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when query exceeds 2000 chars', async () => {
      const res = await POST(makeRequest({ query: 'a'.repeat(2001), locationId: 'tycho', imageAssetIds: [] }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/2000/i)
    })

    it('accepts query of exactly 2000 chars', async () => {
      const res = await POST(makeRequest({ query: 'a'.repeat(2000), locationId: 'tycho', imageAssetIds: [] }))
      expect(res.status).not.toBe(400)
    })

    it('returns 400 when locationId is missing', async () => {
      const res = await POST(makeRequest({ query: 'test query', imageAssetIds: [] }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/locationId/i)
    })

    it('returns 400 when locationId is empty string', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: '', imageAssetIds: [] }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when imageAssetIds is not an array', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: 'tycho', imageAssetIds: 'not-an-array' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/imageAssetIds/i)
    })

    it('returns 400 when imageAssetIds contains non-strings', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: 'tycho', imageAssetIds: [1, 2] }))
      expect(res.status).toBe(400)
    })

    it('returns 400 for unknown locationId', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: 'unknown-location-xyz', imageAssetIds: [] }))
      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toMatch(/Unknown locationId/i)
    })

    it('returns 400 for invalid JSON body', async () => {
      const req = new NextRequest('http://localhost/api/orchestrate', {
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

  describe('valid request', () => {
    it('returns text/event-stream content type for valid request', async () => {
      const res = await POST(makeRequest({ query: 'What is the geology here?', locationId: 'tycho', imageAssetIds: [] }))
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('passes hasImages:false when imageAssetIds is empty', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: 'tycho', imageAssetIds: [] }))
      if (res.body) {
        const reader = res.body.getReader()
        while (!(await reader.read()).done) { /* drain */ }
      }
      expect(mockRunOrchestrator).toHaveBeenCalledWith(expect.objectContaining({ hasImages: false }))
    })

    it('passes hasImages:true when imageAssetIds is non-empty', async () => {
      const res = await POST(makeRequest({ query: 'test query', locationId: 'tycho', imageAssetIds: ['img-001'] }))
      if (res.body) {
        const reader = res.body.getReader()
        while (!(await reader.read()).done) { /* drain */ }
      }
      expect(mockRunOrchestrator).toHaveBeenCalledWith(expect.objectContaining({ hasImages: true }))
    })
  })
})
