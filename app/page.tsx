import Link from 'next/link'

const STARS: { w: number; h: number; top: string; left: string; opacity: number; cyan?: true }[] = [
  { w: 2, h: 2, top: '9%',  left: '7%',  opacity: 0.45 },
  { w: 1, h: 1, top: '16%', left: '22%', opacity: 0.35 },
  { w: 2, h: 2, top: '11%', left: '38%', opacity: 0.4,  cyan: true },
  { w: 1, h: 1, top: '7%',  left: '55%', opacity: 0.5  },
  { w: 2, h: 2, top: '19%', left: '71%', opacity: 0.3  },
  { w: 1, h: 1, top: '13%', left: '84%', opacity: 0.45 },
  { w: 2, h: 2, top: '30%', left: '5%',  opacity: 0.3  },
  { w: 1, h: 1, top: '35%', left: '91%', opacity: 0.4,  cyan: true },
  { w: 2, h: 2, top: '72%', left: '11%', opacity: 0.25 },
  { w: 1, h: 1, top: '80%', left: '30%', opacity: 0.3  },
  { w: 2, h: 2, top: '76%', left: '61%', opacity: 0.2  },
  { w: 1, h: 1, top: '85%', left: '78%', opacity: 0.25 },
  { w: 2, h: 2, top: '68%', left: '88%', opacity: 0.3,  cyan: true },
]

const ARC_RINGS = [
  { size: 320, opacity: 0.12 },
  { size: 440, opacity: 0.06 },
  { size: 560, opacity: 0.03 },
]

const BULLETS = [
  'Pick from 40 of NASA\'s most significant lunar sites',
  'Ask any question — specialist agents pull from real NASA sources in real time',
  'Get a cited research brief in under a minute',
]

export default function IntroPage() {
  return (
    <main className="fixed inset-x-0 bottom-0 top-14 flex items-center justify-center overflow-hidden bg-luna-base">
      {/* Radial gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, #0D1E3A 0%, #050C1A 62%)' }}
      />

      {/* Star field */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.w,
              height: s.h,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
              background: s.cyan ? 'var(--luna-cyan)' : 'var(--luna-fg)',
            }}
          />
        ))}
      </div>

      {/* Lunar arc rings */}
      <div className="pointer-events-none absolute -bottom-[120px] -right-[120px]">
        {ARC_RINGS.map(({ size, opacity }) => (
          <div
            key={size}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size,
              height: size,
              border: `1px solid rgba(125, 211, 252, ${opacity})`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex max-w-[1020px] flex-col items-center px-6 text-center">
        {/* Location dots */}
        <div className="mb-7 flex items-center gap-2.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ border: '1px solid rgba(125, 211, 252, 0.35)', opacity: 0.4 }}
          />
          <div className="h-1.5 w-1.5 rounded-full border border-luna-cyan opacity-70" />
          <div
            className="h-1.5 w-1.5 rounded-full bg-luna-cyan"
            style={{ boxShadow: '0 0 6px rgba(125, 211, 252, 0.5)' }}
          />
          <div className="h-1.5 w-1.5 rounded-full border border-luna-cyan opacity-70" />
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ border: '1px solid rgba(125, 211, 252, 0.35)', opacity: 0.4 }}
          />
        </div>

        <h1
          className="mb-4 font-sans font-semibold leading-[1.06] tracking-[-0.025em] text-luna-fg"
          style={{ fontSize: 'clamp(34px, 5vw, 50px)' }}
        >
          The gap between curiosity
          <br />
          and NASA data, closed.
        </h1>

        <p className="mb-8 text-[15px] tracking-[-0.01em] text-luna-fg-3">
          A multi-agent co-pilot for NASA&apos;s lunar data.
        </p>

        <ul className="mb-10 flex w-full max-w-[380px] flex-col items-start gap-2.5">
          {BULLETS.map((text) => (
            <li key={text} className="flex w-full items-start gap-3 text-[14px] leading-snug text-luna-fg-2">
              <span className="mt-px flex-shrink-0 font-mono text-luna-cyan">—</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/explore"
          className="inline-flex items-center rounded-[3px] bg-luna-fg px-7 py-[11px] font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-luna-base transition-opacity hover:opacity-[0.88]"
        >
          Get Started →
        </Link>
      </div>
    </main>
  )
}
