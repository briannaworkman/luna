import type { JscSample } from '@/lib/types/nasa'
import { fetchJson } from '@/lib/utils/fetch-with-timeout'
import { findNearestStation } from '@/lib/data/apollo-stations'

const JSC_API = 'https://curator.jsc.nasa.gov/rest/lunarapi/samples'
const JSC_CATALOG_URL = 'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm'
export const MAX_JSC_DISTANCE_KM = 500
const MAX_RESULTS = 10

interface JscRawSample {
  GENERIC: string
  SAMPLEID: string | null
  MISSION: string
  STATION: string | null
  ORIGINALWEIGHT: number | null
  SAMPLETYPE: string | null
  SAMPLESUBTYPE: string | null
  GENERICDESCRIPTION: string | null
}

function buildMineralFlags(type: string | null, subtype: string | null): string[] {
  const flags: string[] = []
  if (type) flags.push(type.toLowerCase())
  if (subtype && subtype.toLowerCase() !== type?.toLowerCase()) {
    flags.push(subtype.toLowerCase())
  }
  return flags
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeSamples(raw: JscRawSample[], mission: string, station: string): JscSample[] {
  return raw
    .map((s): JscSample => ({
      sampleId: s.GENERIC,
      mission: s.MISSION || mission,
      station: s.STATION ?? station,
      weightGrams: s.ORIGINALWEIGHT ?? null,
      mineralFlags: buildMineralFlags(s.SAMPLETYPE, s.SAMPLESUBTYPE),
      description: s.GENERICDESCRIPTION ? stripHtml(s.GENERICDESCRIPTION) : null,
      jscUrl: `${JSC_CATALOG_URL}?sample=${s.GENERIC}`,
    }))
    .sort((a, b) => {
      const aIsSoil = a.mineralFlags[0] === 'soil'
      const bIsSoil = b.mineralFlags[0] === 'soil'
      if (aIsSoil !== bIsSoil) return aIsSoil ? 1 : -1
      return (b.weightGrams ?? 0) - (a.weightGrams ?? 0)
    })
    .slice(0, MAX_RESULTS)
}

export async function fetchJscSamples(lat: number, lon: number): Promise<JscSample[]> {
  const nearest = findNearestStation(lat, lon)

  if (!nearest || nearest.distanceKm > MAX_JSC_DISTANCE_KM) {
    return []
  }

  const url = `${JSC_API}/samplesbystation/${encodeURIComponent(nearest.mission)}/${encodeURIComponent(nearest.station)}`
  const raw = await fetchJson<JscRawSample[]>(url)
  return normalizeSamples(raw, nearest.mission, nearest.station)
}
