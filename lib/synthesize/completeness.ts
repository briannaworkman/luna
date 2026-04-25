import type { DataContext } from '@/lib/types/agent'
import { INSTRUMENT_NAC, INSTRUMENT_WAC } from '@/lib/data-sources'
import type { CompletenessStatus } from '@/lib/types/brief'

// ---------------------------------------------------------------------------
// Thresholds — extracted as named constants for tunability
// ---------------------------------------------------------------------------

const NAC_CONFIRMED_THRESHOLD = 2
const WAC_CONFIRMED_THRESHOLD = 1
const SAMPLES_CONFIRMED_THRESHOLD = 3
const SAMPLES_PARTIAL_MIN = 1
const ILLUMINATION_CONFIRMED_THRESHOLD = 7
const ILLUMINATION_PARTIAL_MIN = 1
const NASA_IMAGES_CONFIRMED_THRESHOLD = 3
const NASA_IMAGES_PARTIAL_MIN = 1

// ---------------------------------------------------------------------------
// DataCompleteness map type
// ---------------------------------------------------------------------------

export interface DataCompleteness {
  'LROC NAC': CompletenessStatus
  'LROC WAC': CompletenessStatus
  'JSC Samples': CompletenessStatus
  'SVS Illumination': CompletenessStatus
  'NASA Image Library': CompletenessStatus
}

// ---------------------------------------------------------------------------
// Derivation function
// ---------------------------------------------------------------------------

export function deriveDataCompleteness(ctx: DataContext): DataCompleteness {
  // Count NAC and WAC products separately by instrument label
  let nacCount: number | null = null
  let wacCount: number | null = null

  if (ctx.lrocProducts !== null) {
    nacCount = ctx.lrocProducts.filter((p) =>
      p.instrument.toLowerCase().includes(INSTRUMENT_NAC.toLowerCase())
    ).length
    wacCount = ctx.lrocProducts.filter((p) =>
      p.instrument.toLowerCase().includes(INSTRUMENT_WAC.toLowerCase())
    ).length
  }

  // LROC NAC
  let lrocNac: CompletenessStatus
  if (nacCount === null) {
    lrocNac = 'Incomplete'
  } else if (nacCount >= NAC_CONFIRMED_THRESHOLD) {
    lrocNac = 'Confirmed'
  } else if (nacCount === 1) {
    lrocNac = 'Partial'
  } else {
    // nacCount === 0
    lrocNac = 'Analogue only'
  }

  // LROC WAC
  let lrocWac: CompletenessStatus
  if (wacCount === null) {
    lrocWac = 'Incomplete'
  } else if (wacCount >= WAC_CONFIRMED_THRESHOLD) {
    lrocWac = 'Confirmed'
  } else {
    // wacCount === 0
    lrocWac = 'Analogue only'
  }

  // JSC Samples
  let jscSamples: CompletenessStatus
  if (ctx.jscSamples === null) {
    jscSamples = 'Incomplete'
  } else if (ctx.jscSamples.length >= SAMPLES_CONFIRMED_THRESHOLD) {
    jscSamples = 'Confirmed'
  } else if (ctx.jscSamples.length >= SAMPLES_PARTIAL_MIN) {
    jscSamples = 'Partial'
  } else {
    jscSamples = 'Analogue only'
  }

  // SVS Illumination
  let svsIllumination: CompletenessStatus
  if (ctx.illuminationWindows === null) {
    svsIllumination = 'Incomplete'
  } else if (ctx.illuminationWindows.length >= ILLUMINATION_CONFIRMED_THRESHOLD) {
    svsIllumination = 'Confirmed'
  } else if (ctx.illuminationWindows.length >= ILLUMINATION_PARTIAL_MIN) {
    svsIllumination = 'Partial'
  } else {
    svsIllumination = 'Analogue only'
  }

  // NASA Image Library
  let nasaImageLibrary: CompletenessStatus
  if (ctx.nasaImages === null) {
    nasaImageLibrary = 'Incomplete'
  } else if (ctx.nasaImages.length >= NASA_IMAGES_CONFIRMED_THRESHOLD) {
    nasaImageLibrary = 'Confirmed'
  } else if (ctx.nasaImages.length >= NASA_IMAGES_PARTIAL_MIN) {
    nasaImageLibrary = 'Partial'
  } else {
    nasaImageLibrary = 'Analogue only'
  }

  return {
    'LROC NAC': lrocNac,
    'LROC WAC': lrocWac,
    'JSC Samples': jscSamples,
    'SVS Illumination': svsIllumination,
    'NASA Image Library': nasaImageLibrary,
  }
}
