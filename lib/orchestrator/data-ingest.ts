import type { LunarLocation } from '@/components/globe/types'
import type { OrchestratorEvent, DataContext } from '@/lib/types/agent'
import {
  fetchNasaImages,
  fetchLrocProducts,
  fetchJscSamples,
  fetchIlluminationWindows,
} from '@/lib/data-sources'

function parseDiameterKm(diameter: string | undefined): number | null {
  if (diameter === undefined) return null
  const cleaned = diameter.replace(/~/g, '').replace(/,/g, '')
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

export async function runDataIngest(input: {
  location: LunarLocation
  emit: (event: OrchestratorEvent) => void
}): Promise<DataContext> {
  const { location, emit } = input

  emit({ type: 'agent-activate', agent: 'data-ingest' })

  const query = `${location.name} lunar crater Moon`

  let settled = false
  const timeoutHandle = setTimeout(() => {
    if (!settled) {
      emit({ type: 'agent-status', agent: 'data-ingest', text: 'Still loading NASA data...' })
    }
  }, 8000)

  const [imagesResult, lrocResult, samplesResult, illuminationResult] = await Promise.allSettled([
    fetchNasaImages(query),
    fetchLrocProducts(location.lat, location.lon),
    fetchJscSamples(location.lat, location.lon),
    fetchIlluminationWindows(location.lat, location.lon),
  ])

  settled = true
  clearTimeout(timeoutHandle)

  const nasaImages = imagesResult.status === 'fulfilled'
    ? imagesResult.value
    : (console.warn('[data-ingest] fetchNasaImages failed:', imagesResult.reason), null)

  const lrocProducts = lrocResult.status === 'fulfilled'
    ? lrocResult.value
    : (console.warn('[data-ingest] fetchLrocProducts failed:', lrocResult.reason), null)

  const jscSamples = samplesResult.status === 'fulfilled'
    ? samplesResult.value
    : (console.warn('[data-ingest] fetchJscSamples failed:', samplesResult.reason), null)

  const illuminationWindows = illuminationResult.status === 'fulfilled'
    ? illuminationResult.value
    : (console.warn('[data-ingest] fetchIlluminationWindows failed:', illuminationResult.reason), null)

  emit({ type: 'agent-complete', agent: 'data-ingest' })

  return {
    location: {
      name: location.name,
      lat: location.lat,
      lon: location.lon,
      diameterKm: parseDiameterKm(location.diameter),
      significanceNote: location.significance,
      isProposed: location.isProposed,
    },
    nasaImages,
    lrocProducts,
    jscSamples,
    illuminationWindows,
  }
}
