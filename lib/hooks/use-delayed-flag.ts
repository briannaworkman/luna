import { useEffect, useState } from 'react'

// Returns true only after `active` has been true continuously for `delayMs`.
// Flips back to false the instant `active` goes false, with no trailing flash.
// Useful for "don't show a loading skeleton unless the work takes long enough
// to justify one" — the caller passes `loading` as `active`.
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [flagged, setFlagged] = useState(false)

  useEffect(() => {
    if (!active) {
      setFlagged(false)
      return
    }
    const timer = setTimeout(() => setFlagged(true), delayMs)
    return () => {
      clearTimeout(timer)
      setFlagged(false)
    }
  }, [active, delayMs])

  return flagged
}
