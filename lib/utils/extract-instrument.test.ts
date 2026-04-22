import { describe, it, expect } from 'vitest';
import { extractInstrument } from './extract-instrument';

describe('extractInstrument', () => {
  it('matches LROC NAC', () => {
    expect(extractInstrument(['LROC NAC', 'lunar surface'])).toBe('LROC NAC');
  });

  it('matches LROC WAC', () => {
    expect(extractInstrument(['LROC WAC', 'lunar surface'])).toBe('LROC WAC');
  });

  it('matches generic LROC when NAC/WAC not present', () => {
    expect(extractInstrument(['LROC', 'lunar surface'])).toBe('LROC');
  });

  it('prioritizes LROC NAC over generic LROC', () => {
    expect(extractInstrument(['LROC', 'LROC NAC'])).toBe('LROC NAC');
  });

  it('matches full name Lunar Reconnaissance Orbiter Camera', () => {
    expect(extractInstrument(['Lunar Reconnaissance Orbiter Camera'])).toBe('LROC');
  });

  it('matches LRO when LROC not present', () => {
    expect(extractInstrument(['LRO imagery'])).toBe('LRO');
  });

  it('matches Artemis II crew', () => {
    expect(extractInstrument(['Artemis II', 'lunar flyby'])).toBe('Artemis II crew');
  });

  it('matches Artemis 2 crew', () => {
    expect(extractInstrument(['Artemis 2', 'crew photography'])).toBe('Artemis II crew');
  });

  it('matches Apollo', () => {
    expect(extractInstrument(['Apollo 11', 'lunar surface'])).toBe('Apollo');
  });

  it('matches Clementine', () => {
    expect(extractInstrument(['Clementine mission'])).toBe('Clementine');
  });

  it('is case-insensitive', () => {
    expect(extractInstrument(['lroc nac imagery'])).toBe('LROC NAC');
  });

  it('returns Unknown instrument when no keywords match', () => {
    expect(extractInstrument(['unrelated tag'])).toBe('Unknown instrument');
  });

  it('returns Unknown instrument for empty keywords', () => {
    expect(extractInstrument([])).toBe('Unknown instrument');
  });
});
