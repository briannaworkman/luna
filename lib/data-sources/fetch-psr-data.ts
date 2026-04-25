import type { LampProduct, PsrDataResponse, PsrSummary } from '@/lib/types/nasa'
import { fetchJson } from '@/lib/utils/fetch-with-timeout'

const ODE_API = 'https://oderest.rsl.wustl.edu/live2/'
const BOX_HALF_DEG = 1.0

const PSR_SUMMARIES: PsrSummary[] = [
  {
    locationId: 'shackleton',
    locationName: 'Shackleton Crater',
    iceConfidence: 'confirmed',
    detectionMethods: ['LRO LAMP UV reflectance', 'LRO LEND neutron spectrometer', 'Mini-RF radar'],
    estimatedIcePct: '5–10% by weight near surface',
    notes: 'Water ice detected in permanently shadowed interior by LAMP (Hayne et al. 2015). Rim receives up to 89% illumination.',
  },
  {
    locationId: 'nobile',
    locationName: 'Nobile Crater',
    iceConfidence: 'confirmed',
    detectionMethods: ['LRO LAMP UV reflectance', 'LRO LEND neutron spectrometer', 'LCROSS impact analysis'],
    estimatedIcePct: '1–10% by weight',
    notes: 'VIPER rover target. High hydrogen signatures from LEND. Multiple permanently shadowed sub-regions identified.',
  },
  {
    locationId: 'haworth',
    locationName: 'Haworth Crater',
    iceConfidence: 'probable',
    detectionMethods: ['LRO LAMP UV reflectance', 'LRO LEND neutron spectrometer'],
    estimatedIcePct: '1–5% by weight (estimated)',
    notes: 'LAMP UV data shows enhanced water ice signatures in permanently shadowed areas. Active Artemis III candidate.',
  },
]

function findPsrSummary(lat: number, lon: number): PsrSummary | null {
  if (lat > -80) return null
  // Shackleton: 89.9°S, 0°
  if (lat <= -89 && Math.abs(lon) <= 10) return PSR_SUMMARIES[0]!
  // Nobile: 85.2°S, 53.5°E
  if (lat >= -86.5 && lat <= -83.5 && lon >= 48 && lon <= 59) return PSR_SUMMARIES[1]!
  // Haworth: 87.5°S, 5°W
  if (lat >= -89 && lat <= -86 && lon >= -10 && lon <= 0) return PSR_SUMMARIES[2]!
  return null
}

function toPositiveLon(lon: number): number {
  return lon < 0 ? lon + 360 : lon
}

interface OdeLampProduct {
  Product_name?: string
  Map_resolution?: string
  Observation_time?: string
  External_url?: string
}

interface OdeJson {
  ODEResults: {
    Status: string
    Products?: { Product?: unknown }
  }
}

async function fetchLampProducts(lat: number, lon: number): Promise<LampProduct[]> {
  const minlat = Math.max(-90, lat - BOX_HALF_DEG)
  const maxlat = Math.min(90, lat + BOX_HALF_DEG)
  const westernlon = toPositiveLon(lon - BOX_HALF_DEG)
  const easternlon = toPositiveLon(lon + BOX_HALF_DEG)

  const url = new URL(ODE_API)
  url.searchParams.set('query', 'product')
  url.searchParams.set('results', 'm')
  url.searchParams.set('output', 'JSON')
  url.searchParams.set('target', 'moon')
  url.searchParams.set('ihid', 'lro')
  url.searchParams.set('iid', 'lamp')
  url.searchParams.set('westernlon', String(westernlon))
  url.searchParams.set('easternlon', String(easternlon))
  url.searchParams.set('minlat', String(minlat))
  url.searchParams.set('maxlat', String(maxlat))

  try {
    const json = await fetchJson<OdeJson>(url)
    const result = json.ODEResults
    if (result.Status === 'ERROR' || !result.Products) return []

    const raw = result.Products.Product
    if (!raw) return []
    const products: OdeLampProduct[] = Array.isArray(raw) ? raw : [raw]

    return products
      .map((p): LampProduct | null => {
        if (!p.Product_name || !p.Map_resolution || !p.Observation_time || !p.External_url) return null
        const resolutionMpp = parseFloat(p.Map_resolution)
        if (isNaN(resolutionMpp)) return null
        return {
          productId: p.Product_name.replace(/\.[^.]+$/, ''),
          resolutionMpp,
          acquisitionDate: p.Observation_time,
          downloadUrl: p.External_url,
        }
      })
      .filter((p): p is LampProduct => p !== null)
      .sort((a, b) => a.resolutionMpp - b.resolutionMpp)
      .slice(0, 10)
  } catch {
    return []
  }
}

export async function fetchPsrData(lat: number, lon: number): Promise<PsrDataResponse> {
  const [lampProducts, psrSummary] = await Promise.all([
    fetchLampProducts(lat, lon),
    Promise.resolve(findPsrSummary(lat, lon)),
  ])
  return { lampProducts, psrSummary }
}
