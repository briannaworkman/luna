export const QUERY_MAX = 500
export const COUNTER_THRESHOLD = 100

export function isAtCharLimit(text: string, max: number): boolean {
  return text.length >= max
}

export function showCharCounter(text: string, max: number, threshold: number): boolean {
  return max - text.length <= threshold
}

export function charCountLabel(text: string, max: number): string {
  return `${text.length} / ${max}`
}
