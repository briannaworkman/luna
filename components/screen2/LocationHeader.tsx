'use client'
import { Badge } from '@/components/badge'
import { Eyebrow } from '@/components/ui/eyebrow'
import { displayLocationName, formatLat, formatLon } from '@/lib/utils/location'
import type { LunarLocation } from '@/components/globe/types'

function DotJoin({ items, sepClassName }: { items: React.ReactNode[]; sepClassName: string }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className={sepClassName}>·</span>}
          {item}
        </span>
      ))}
    </>
  )
}

export function LocationHeader({ location }: { location: LunarLocation }) {
  const coordParts: React.ReactNode[] = [
    <span key="lat">{formatLat(location.lat)}</span>,
    <span key="lon">{formatLon(location.lon)}</span>,
  ]
  if (location.diameter) coordParts.push(<span key="d">{location.diameter}</span>)

  return (
    <section className="border-b border-luna-hairline pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col min-w-0">
          <Eyebrow className="text-luna-cyan mb-3.5">
            <DotJoin
              items={['ARTEMIS', location.region]}
              sepClassName="text-luna-fg-3 mx-2"
            />
          </Eyebrow>

          <h1 className="flex items-center gap-3 font-sans font-medium text-[32px] leading-[1.1] tracking-[-0.01em] text-luna-fg m-0 mb-3.5">
            {displayLocationName(location)}
            {location.isProposed && (
              <Badge variant="cyan" className="lowercase translate-y-[3px]">
                proposed
              </Badge>
            )}
          </h1>

          <div className="flex items-center gap-2 font-mono text-[13px] text-luna-fg-3 tracking-[0.02em]">
            <DotJoin items={coordParts} sepClassName="text-luna-fg-4 mx-1" />
          </div>
        </div>

        <div className="flex flex-col items-end text-right pt-7">
          {location.namingStory && (
            <p className="font-sans text-[13px] leading-[1.6] text-luna-fg-2 m-0 mb-4.5 max-w-[320px] ml-auto text-pretty">
              {location.namingStory}
            </p>
          )}

          {location.namedBy && location.namedBy.length > 0 && (
            <>
              <Eyebrow className="text-luna-fg-3 mb-2">Named by</Eyebrow>
              <div className="font-sans text-[12px] leading-[1.55] text-luna-fg">
                <DotJoin items={location.namedBy} sepClassName="text-luna-fg-3 mx-1.5" />
              </div>
            </>
          )}

          {location.citations && location.citations.length > 0 && (
            <div className="mt-6 font-mono text-[11px] tracking-[0.06em] text-luna-fg-3 leading-[1.7]">
              <DotJoin items={location.citations} sepClassName="text-luna-hairline-2 mx-2.5" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
