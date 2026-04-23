import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'

export function useDialogDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return useCallback(
    (e: React.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    },
    [ref, onClose],
  )
}
