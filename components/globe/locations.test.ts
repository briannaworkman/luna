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
        expect(
          typeof q === 'string' && q.trim().length > 0,
          `${loc.name} has a blank or non-string question`,
        ).toBe(true)
      }
    }
  })
})
