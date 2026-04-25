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
    const validTypes = new Set<string>(['crater', 'apollo', 'robotic', 'proposed', 'feature'])
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

  it('all six Apollo landing sites have type "apollo"', () => {
    const apolloIds = ['apollo11', 'apollo12', 'apollo14', 'apollo15', 'apollo16', 'apollo17']
    for (const id of apolloIds) {
      const loc = LOCATIONS.find(l => l.id === id)
      expect(loc, `Missing Apollo location: ${id}`).toBeDefined()
      expect(loc?.type).toBe('apollo')
    }
  })

  it('all robotic lander sites have type "robotic"', () => {
    const roboticIds = ['surveyor3', 'luna9', 'luna24', 'change4', 'change5', 'slim']
    for (const id of roboticIds) {
      const loc = LOCATIONS.find(l => l.id === id)
      expect(loc, `Missing robotic location: ${id}`).toBeDefined()
      expect(loc?.type).toBe('robotic')
    }
  })

  it('mare regions and unique features have type "feature"', () => {
    const featureIds = [
      'malapert',
      'mare-imbrium', 'mare-tranquillitatis', 'oceanus-procellarum', 'mare-crisium',
      'reiner-gamma', 'vallis-schroteri',
    ]
    for (const id of featureIds) {
      const loc = LOCATIONS.find(l => l.id === id)
      expect(loc, `Missing feature location: ${id}`).toBeDefined()
      expect(loc?.type).toBe('feature')
    }
  })

  it('every location has a non-empty id, name, significance, coords, and region', () => {
    for (const loc of LOCATIONS) {
      expect(loc.id.trim().length, `${loc.name} has empty id`).toBeGreaterThan(0)
      expect(loc.name.trim().length, `${loc.id} has empty name`).toBeGreaterThan(0)
      expect(loc.significance.trim().length, `${loc.name} has empty significance`).toBeGreaterThan(0)
      expect(loc.coords.trim().length, `${loc.name} has empty coords`).toBeGreaterThan(0)
      expect(['NEAR SIDE', 'FAR SIDE']).toContain(loc.region)
    }
  })

  it('all IDs are unique', () => {
    const ids = LOCATIONS.map(l => l.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
