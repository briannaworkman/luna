import type { DataContext } from '@/lib/types/agent'
import { INSTRUMENT_NAC, INSTRUMENT_WAC } from '@/lib/data-sources'
import type {
  CompletenessSource,
  CompletenessStatus,
} from '@/lib/types/brief'

const NAC_CONFIRMED = 2
const WAC_CONFIRMED = 1
const SAMPLES_CONFIRMED = 3
const ILLUMINATION_CONFIRMED = 7
const NASA_IMAGES_CONFIRMED = 3

export type DataCompleteness = Record<CompletenessSource, CompletenessStatus>

/**
 * Maps a count of available items to a CompletenessStatus.
 * `null` = upstream errored. `partialMin` may be omitted for binary
 * sources (WAC: ≥1 = Confirmed, 0 = Analogue only — no Partial state).
 */
function statusFromCount(
  count: number | null,
  confirmed: number,
  partialMin?: number,
): CompletenessStatus {
  if (count === null) return 'Incomplete'
  if (count >= confirmed) return 'Confirmed'
  if (partialMin !== undefined && count >= partialMin) return 'Partial'
  return 'Analogue only'
}

export function deriveDataCompleteness(ctx: DataContext): DataCompleteness {
  const nacCount =
    ctx.lrocProducts?.filter((p) => p.instrument === INSTRUMENT_NAC).length ?? null
  const wacCount =
    ctx.lrocProducts?.filter((p) => p.instrument === INSTRUMENT_WAC).length ?? null

  return {
    'LROC NAC': statusFromCount(nacCount, NAC_CONFIRMED, 1),
    'LROC WAC': statusFromCount(wacCount, WAC_CONFIRMED),
    'JSC Samples': statusFromCount(ctx.jscSamples?.length ?? null, SAMPLES_CONFIRMED, 1),
    'SVS Illumination': statusFromCount(
      ctx.illuminationWindows?.length ?? null,
      ILLUMINATION_CONFIRMED,
      1,
    ),
    'NASA Image Library': statusFromCount(
      ctx.nasaImages?.length ?? null,
      NASA_IMAGES_CONFIRMED,
      1,
    ),
  }
}
