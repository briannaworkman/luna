import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('getAnthropic', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const { getAnthropic } = await import('./anthropic')
    expect(() => getAnthropic()).toThrow('ANTHROPIC_API_KEY is not set')
  })

  it('returns the same singleton instance on repeated calls', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const { getAnthropic } = await import('./anthropic')
    const a = getAnthropic()
    const b = getAnthropic()
    expect(a).toBe(b)
  })
})
