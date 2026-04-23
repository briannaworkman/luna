import { describe, it, expect } from 'vitest'
import { isAtCharLimit, showCharCounter, charCountLabel, QUERY_MAX, COUNTER_THRESHOLD } from './text'

describe('isAtCharLimit', () => {
  it('returns true when text length equals max', () => {
    expect(isAtCharLimit('a'.repeat(500), 500)).toBe(true)
  })

  it('returns false when text length is one below max', () => {
    expect(isAtCharLimit('a'.repeat(499), 500)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAtCharLimit('', 500)).toBe(false)
  })
})

describe('showCharCounter', () => {
  it('returns true when remaining chars is less than threshold (99 remaining < 100)', () => {
    expect(showCharCounter('a'.repeat(401), 500, 100)).toBe(true)
  })

  it('returns true when remaining chars equals threshold (100 remaining, threshold inclusive)', () => {
    expect(showCharCounter('a'.repeat(400), 500, 100)).toBe(true)
  })

  it('returns false one character before threshold (101 remaining)', () => {
    expect(showCharCounter('a'.repeat(399), 500, 100)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(showCharCounter('', 500, 100)).toBe(false)
  })
})

describe('charCountLabel', () => {
  it('formats count and max correctly', () => {
    expect(charCountLabel('a'.repeat(123), 500)).toBe('123 / 500')
  })

  it('formats empty string as 0 / max', () => {
    expect(charCountLabel('', 500)).toBe('0 / 500')
  })
})

describe('constants', () => {
  it('QUERY_MAX is 500', () => {
    expect(QUERY_MAX).toBe(500)
  })

  it('COUNTER_THRESHOLD is 100', () => {
    expect(COUNTER_THRESHOLD).toBe(100)
  })
})
