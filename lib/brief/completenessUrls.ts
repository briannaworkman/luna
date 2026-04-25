import type { CompletenessSource } from '@/lib/types/brief'

/**
 * Landing URLs for each completeness data source.
 * Clicking a row in CompletenessPanel opens this URL in a new tab.
 */
// ODE has no separate NAC vs WAC landing page; use the canonical PDS Cartography
// per-instrument archive URLs so the two LROC rows resolve to genuinely distinct
// destinations rather than the same ODE explorer.
export const COMPLETENESS_LANDING_URLS: Record<CompletenessSource, string> = {
  'LROC NAC':          'https://pds.lroc.asu.edu/data/LRO-L-LROC-2-EDR-V1.0/',
  'LROC WAC':          'https://wms.lroc.asu.edu/lroc/wac_landing',
  'JSC Samples':       'https://curator.jsc.nasa.gov/lunar/samplecatalog/index.cfm',
  'SVS Illumination':  'https://svs.gsfc.nasa.gov/5587',
  'NASA Image Library': 'https://images.nasa.gov/',
}
