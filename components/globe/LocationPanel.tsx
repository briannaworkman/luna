'use client'

import { useEffect, useRef } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { LunarLocation } from './types'

interface LocationPanelProps {
  location: LunarLocation | null
  onClose: () => void
  onResearch: (location: LunarLocation) => void
}

export function LocationPanel({ location, onClose, onResearch }: LocationPanelProps) {
  const open = location !== null
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Click outside panel to close
  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  return (
    // Backdrop — covers the full screen but is pointer-events:none when closed
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: open ? 'auto' : 'none',
        zIndex: 20,
      }}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '320px',
          background: 'rgba(10, 20, 36, 0.92)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--luna-hairline)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          opacity: open ? 1 : 0,
          transition: open
            ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          pointerEvents: open ? 'auto' : 'none',
          boxShadow: open ? 'var(--luna-shadow-lg)' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 20px 0',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'var(--luna-font-mono)',
                fontSize: '10px',
                letterSpacing: '0.14em',
                color: 'var(--luna-cyan)',
                textTransform: 'uppercase',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Location
            </p>
            <h2
              style={{
                fontFamily: 'var(--luna-font-body)',
                fontSize: '17px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--luna-fg)',
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {location?.name ?? ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              flexShrink: 0,
              marginTop: '2px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid var(--luna-hairline)',
              borderRadius: '4px',
              color: 'var(--luna-fg-3)',
              cursor: 'pointer',
              transition: 'color 120ms, border-color 120ms, background 120ms',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget
              b.style.color = 'var(--luna-fg)'
              b.style.borderColor = 'var(--luna-hairline-2)'
              b.style.background = 'var(--luna-base-2)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget
              b.style.color = 'var(--luna-fg-3)'
              b.style.borderColor = 'var(--luna-hairline)'
              b.style.background = 'transparent'
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'var(--luna-hairline)',
            margin: '16px 20px 0',
          }}
        />

        {/* Data fields */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Coordinates */}
          <div>
            <p
              style={{
                fontFamily: 'var(--luna-font-mono)',
                fontSize: '10px',
                letterSpacing: '0.14em',
                color: 'var(--luna-fg-4)',
                textTransform: 'uppercase',
                marginBottom: '4px',
                fontWeight: 500,
              }}
            >
              Coordinates
            </p>
            <p
              style={{
                fontFamily: 'var(--luna-font-mono)',
                fontSize: '13px',
                color: 'var(--luna-fg)',
                letterSpacing: '0.02em',
                margin: 0,
              }}
            >
              {location?.coords ?? ''}
            </p>
          </div>

          {/* Diameter — only if present */}
          {location?.diameter && (
            <div>
              <p
                style={{
                  fontFamily: 'var(--luna-font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  color: 'var(--luna-fg-4)',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  fontWeight: 500,
                }}
              >
                Diameter
              </p>
              <p
                style={{
                  fontFamily: 'var(--luna-font-mono)',
                  fontSize: '13px',
                  color: 'var(--luna-fg)',
                  letterSpacing: '0.02em',
                  margin: 0,
                }}
              >
                {location.diameter}
              </p>
            </div>
          )}

          {/* Significance */}
          <div>
            <p
              style={{
                fontFamily: 'var(--luna-font-mono)',
                fontSize: '10px',
                letterSpacing: '0.14em',
                color: 'var(--luna-fg-4)',
                textTransform: 'uppercase',
                marginBottom: '4px',
                fontWeight: 500,
              }}
            >
              Significance
            </p>
            <p
              style={{
                fontFamily: 'var(--luna-font-body)',
                fontSize: '13px',
                color: 'var(--luna-fg-2)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {location?.significance ?? ''}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            padding: '16px 20px 20px',
            borderTop: '1px solid var(--luna-hairline)',
          }}
        >
          <button
            onClick={() => location && onResearch(location)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '11px 16px',
              background: 'var(--luna-cyan)',
              color: 'var(--luna-base)',
              fontFamily: 'var(--luna-font-body)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.01em',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 150ms, box-shadow 150ms',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget
              b.style.background = '#a5e3fd'
              b.style.boxShadow = '0 0 0 1px rgba(125,211,252,0.5), 0 4px 16px rgba(125,211,252,0.2)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget
              b.style.background = 'var(--luna-cyan)'
              b.style.boxShadow = 'none'
            }}
          >
            <span>Research this location</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
