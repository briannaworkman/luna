import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('formats a full ISO date string', () => {
    expect(formatDate('2024-07-20')).toBe('July 20, 2024');
  });

  it('formats an ISO datetime string', () => {
    expect(formatDate('2024-07-20T13:45:00Z')).toBe('July 20, 2024');
  });

  it('handles a leap day', () => {
    expect(formatDate('2024-02-29')).toBe('February 29, 2024');
  });

  it('handles the first day of the year', () => {
    expect(formatDate('2023-01-01')).toBe('January 1, 2023');
  });

  it('handles the last day of the year', () => {
    expect(formatDate('2023-12-31')).toBe('December 31, 2023');
  });
});
