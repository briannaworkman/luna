'use client'
import { displayLocationName } from '@/lib/utils/location'
import type { LunarLocation } from '@/components/globe/types'

export function LocationHeader({ location }: { location: LunarLocation }) {
  return (
    <section className="border-b border-luna-hairline pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col min-w-0">
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan mb-3.5">
            ARTEMIS
            <span className="text-luna-fg-3 mx-2">·</span>
            {location.region}
          </div>

          <h1 className="flex items-center gap-3 font-sans font-medium text-[32px] leading-[1.1] tracking-[-0.01em] text-luna-fg m-0 mb-3.5">
            {displayLocationName(location)}
            {location.isProposed && (
              <span className="inline-flex items-center h-5 px-1.5 bg-luna-base-3 text-luna-cyan rounded-xs font-mono text-[10px] tracking-[0.08em] font-medium lowercase translate-y-[3px]">
                proposed
              </span>
            )}
          </h1>

          <div className="flex items-center gap-2 font-mono text-[13px] text-luna-fg-3 tracking-[0.02em]">
            <span>{location.lat >= 0 ? `${location.lat}°N` : `${Math.abs(location.lat)}°S`}</span>
            <span className="text-luna-fg-4">·</span>
            <span>{location.lon >= 0 ? `${location.lon}°E` : `${Math.abs(location.lon)}°W`}</span>
            {location.diameter && (
              <>
                <span className="text-luna-fg-4">·</span>
                <span>{location.diameter}</span>
              </>
            )}
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
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 mb-2">
                Named by
              </div>
              <div className="font-sans text-[12px] leading-[1.55] text-luna-fg">
                {location.namedBy.map((name, i) => (
                  <span key={name}>
                    {i > 0 && <span className="text-luna-fg-3 mx-1.5">·</span>}
                    {name}
                  </span>
                ))}
              </div>
            </>
          )}

          {location.citations && location.citations.length > 0 && (
            <div className="mt-6 font-mono text-[11px] tracking-[0.06em] text-luna-fg-3 leading-[1.7]">
              {location.citations.map((c, i) => (
                <span key={c}>
                  {i > 0 && <span className="text-luna-hairline-2 mx-2.5">·</span>}
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
