import { describe, it, expect } from 'vitest';
import { extractInstrument } from './extract-instrument';

describe('extractInstrument', () => {
  it('matches LROC', () => {
    expect(extractInstrument(['LROC', 'lunar surface'], 'GSFC')).toBe('LROC');
  });

  it('matches full name Lunar Reconnaissance Orbiter Camera', () => {
    expect(extractInstrument(['Lunar Reconnaissance Orbiter Camera'], 'GSFC')).toBe('LROC');
  });

  it('matches LRO when LROC not present', () => {
    expect(extractInstrument(['LRO imagery'], 'GSFC')).toBe('LRO');
  });

  it('prioritizes LROC over LRO', () => {
    expect(extractInstrument(['LRO', 'LROC'], 'GSFC')).toBe('LROC');
  });

  it('matches Apollo', () => {
    expect(extractInstrument(['Apollo 11', 'lunar surface'], 'JSC')).toBe('Apollo');
  });

  it('matches Clementine', () => {
    expect(extractInstrument(['Clementine mission'], 'GSFC')).toBe('Clementine');
  });

  it('is case-insensitive', () => {
    expect(extractInstrument(['lroc nac imagery'], '')).toBe('LROC');
  });

  it('falls back to center when no keyword matches', () => {
    expect(extractInstrument(['some unknown instrument'], 'JPL')).toBe('JPL');
  });

  it('falls back to NASA when no keywords and no center', () => {
    expect(extractInstrument([], '')).toBe('NASA');
  });

  it('falls back to NASA when keywords have no match and center is empty', () => {
    expect(extractInstrument(['unrelated tag'], '')).toBe('NASA');
  });
});
