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

  function valueOrNull<T>(result: PromiseSettledResult<T>, label: string): T | null {
    if (result.status === 'fulfilled') return result.value
    console.warn(`[data-ingest] ${label} failed:`, result.reason)
    return null
  }

  const nasaImages = valueOrNull(imagesResult, 'fetchNasaImages')
  const lrocProducts = valueOrNull(lrocResult, 'fetchLrocProducts')
  const jscSamples = valueOrNull(samplesResult, 'fetchJscSamples')
  const illuminationWindows = valueOrNull(illuminationResult, 'fetchIlluminationWindows')

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
