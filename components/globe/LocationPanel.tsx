'use client'

import { useEffect, useRef } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/badge'
import type { LunarLocation } from './types'

interface LocationPanelProps {
  location: LunarLocation | null
  onClose: () => void
  onResearch: (location: LunarLocation) => void
}

export function LocationPanel({ location, onClose, onResearch }: LocationPanelProps) {
  const open = location !== null
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className={cn('absolute inset-0 z-20', open ? 'pointer-events-auto' : 'pointer-events-none')}
    >
      <div
        ref={panelRef}
        className={cn(
          'absolute top-0 right-0 bottom-0 w-[360px]',
          'bg-luna-base-2 border-l border-luna-hairline',
          'flex flex-col',
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none',
        )}
        style={{
          transition: open
            ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {/* Panel top */}
        <div className="px-8 pt-8">
          {/* Mission crumb + close */}
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan">
              {location?.region ?? ''}
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="w-6 h-6 grid place-items-center bg-transparent border-none text-luna-fg-3 cursor-pointer rounded-sm transition-colors hover:text-luna-fg hover:bg-luna-base-3"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Name + proposed badge */}
          <div className="flex items-center gap-3 mt-1 mb-5">
            <h1 className="font-sans font-medium text-[28px] leading-[1.15] tracking-[-0.01em] text-luna-fg m-0">
              {location?.name ?? ''}
            </h1>
            {location?.isProposed && (
              <Badge className="translate-y-0.5">proposed</Badge>
            )}
          </div>
        </div>

        <div className="h-px bg-luna-hairline" />

        {/* Coordinates */}
        <div className="px-8 pt-5 pb-6">
          <div className="font-mono text-[13px] text-luna-cyan tracking-[0.02em] tabular-nums flex items-center gap-5">
            {location?.coords.split(',').map((part, i) => (
              <span key={i}>{part.trim()}</span>
            ))}
          </div>
          <div className="mt-2 font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3">
            LROC confirmed · Apr 6 2026
          </div>
        </div>

        <div className="h-px bg-luna-hairline" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Significance */}
          <div className="px-8 pt-5 pb-1">
            <p className="font-sans text-sm leading-relaxed text-luna-fg-2 m-0">
              {location?.significance ?? ''}
            </p>
          </div>

          {/* Naming story */}
          {location?.namingStory && (
            <div className="mx-8 mt-4 mb-1 px-4 py-3 border-l-2 border-luna-cyan/30 bg-luna-base-3/40">
              <p className="font-sans text-[12.5px] leading-relaxed text-luna-fg-3 m-0 italic">
                {location.namingStory}
              </p>
            </div>
          )}

          {/* Diameter */}
          {location?.diameter && (
            <div className="px-8 pt-4 pb-1">
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 mb-2.5">
                Diameter
              </div>
              <div className="font-mono text-[13px] text-luna-fg tracking-[0.02em]">
                {location.diameter}
              </div>
            </div>
          )}

          {/* Named by */}
          {location?.namedBy && location.namedBy.length > 0 && (
            <div className="px-8 py-6">
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 mb-2.5">
                Named by
              </div>
              <div className="font-sans text-[13px] text-luna-fg leading-[1.55]">
                {location.namedBy.map((name, i) => (
                  <span key={name}>
                    {name}
                    {i < location.namedBy!.length - 1 && (
                      <span className="text-luna-fg-3 mx-1.5">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="px-8 pt-5 pb-8 border-t border-luna-hairline">
          <button
            onClick={() => location && onResearch(location)}
            className="w-full h-10 bg-luna-cyan text-luna-base border border-luna-cyan rounded font-sans font-medium text-sm cursor-pointer inline-flex items-center justify-center gap-2 transition-colors hover:bg-luna-cyan-dim hover:border-luna-cyan-dim"
          >
            Analyze this location
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}
