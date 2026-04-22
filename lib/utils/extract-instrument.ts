import { INSTRUMENT_KEYWORDS } from '@/lib/constants/instruments';

export function extractInstrument(keywords: string[], center: string): string {
  const combined = keywords.join(' ');
  for (const [pattern, label] of INSTRUMENT_KEYWORDS) {
    if (pattern.test(combined)) return label;
  }
  return center || 'NASA';
}
