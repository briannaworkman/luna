import { describe, it, expect } from 'vitest'
import { LOCATIONS } from './locations'

describe('LOCATIONS', () => {
  it('every location has exactly 3 suggestedQuestions', () => {
    for (const loc of LOCATIONS) {
      expect(
        loc.suggestedQuestions,
        `${loc.name} is missing suggestedQuestions`,
      ).toBeDefined()
      expect(
        loc.suggestedQuestions!.length,
        `${loc.name} should have 3 suggestedQuestions`,
      ).toBe(3)
      for (const q of loc.suggestedQuestions!) {
        expect(q.trim().length, `${loc.name} has a blank question: "${q}"`).toBeGreaterThan(0)
      }
    }
  })

  it('every location has a valid type', () => {
    const validTypes = new Set<string>(['crater', 'apollo', 'robotic', 'proposed'])
    for (const loc of LOCATIONS) {
      expect(
        validTypes.has(loc.type),
        `${loc.name} has unexpected type: "${loc.type}"`,
      ).toBe(true)
    }
  })

  it('carroll and integrity have type "proposed"', () => {
    const carroll = LOCATIONS.find(l => l.id === 'carroll')
    const integrity = LOCATIONS.find(l => l.id === 'integrity')
    expect(carroll?.type).toBe('proposed')
    expect(integrity?.type).toBe('proposed')
  })

  it('all non-proposed locations have type "crater" in V1 dataset', () => {
    for (const loc of LOCATIONS.filter(l => l.type !== 'proposed')) {
      expect(loc.type, `${loc.name} should be "crater"`).toBe('crater')
    }
  })
})
