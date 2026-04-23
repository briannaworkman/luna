'use client'
import { forwardRef, useLayoutEffect } from 'react'
import { cn } from '@/lib/utils'
import { QUERY_MAX, COUNTER_THRESHOLD, isAtCharLimit, showCharCounter, charCountLabel } from '@/lib/utils/text'

interface QueryTextareaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  shaking: boolean
  emptyHint: boolean
}

export const QueryTextarea = forwardRef<HTMLTextAreaElement, QueryTextareaProps>(
  function QueryTextarea({ value, onChange, onSubmit, shaking, emptyHint }, ref) {
    useLayoutEffect(() => {
      const ta = (ref as React.RefObject<HTMLTextAreaElement | null>)?.current
      if (!ta) return
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
    }, [value, ref])

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      onChange(e.target.value.slice(0, QUERY_MAX))
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      }
    }

    const atLimit = isAtCharLimit(value, QUERY_MAX)
    const showCounter = showCharCounter(value, QUERY_MAX, COUNTER_THRESHOLD)

    return (
      <div className={cn('flex flex-col gap-1', shaking && 'animate-luna-shake')}>
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Ask anything about this location — geology, landing suitability, mission history..."
          className={cn(
            'w-full resize-none rounded border bg-luna-base-2 px-4 py-3',
            'font-sans text-[15px] text-luna-fg placeholder:text-luna-fg-4',
            'leading-relaxed',
            'border-luna-hairline focus:border-luna-cyan focus:outline-none',
            'transition-colors duration-[120ms]',
            atLimit && 'border-luna-danger',
          )}
          style={{ minHeight: '120px' }}
          aria-label="Research query"
          aria-describedby={
            [showCounter && 'query-char-count', emptyHint && 'query-empty-hint']
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        {showCounter && (
          <p
            id="query-char-count"
            className={cn(
              'font-mono text-[11px] text-right',
              atLimit ? 'text-luna-danger' : 'text-luna-fg-3',
            )}
          >
            {charCountLabel(value, QUERY_MAX)}
          </p>
        )}
        {emptyHint && (
          <p
            id="query-empty-hint"
            role="alert"
            className="font-mono text-[11px] text-luna-danger"
          >
            Add a question to continue
          </p>
        )}
      </div>
    )
  },
)
