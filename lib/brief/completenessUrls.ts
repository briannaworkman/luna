import type { CompletenessSource } from '@/lib/types/brief'

/**
 * Landing URLs for each completeness data source.
 * Clicking a row in CompletenessPanel opens this URL in a new tab.
 */
export const COMPLETENESS_LANDING_URLS: Record<CompletenessSource, string> = {
  'LROC NAC':          'https://oderest.rsl.wustl.edu/live2/',
  'LROC WAC':          'https://oderest.rsl.wustl.edu/live2/',
  'JSC Samples':       'https://curator.jsc.nasa.gov/lunar/samplecatalog/index.cfm',
  'SVS Illumination':  'https://svs.gsfc.nasa.gov/5587',
  'NASA Image Library': 'https://images.nasa.gov/',
}
