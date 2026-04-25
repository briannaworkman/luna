import type { LunarSampleMeta, LunarSamplesResponse, NasaImage } from '@/lib/types/nasa'
import { fetchNasaImages } from './fetch-nasa-images'

const SAMPLE_META: Record<string, LunarSampleMeta> = {
  change5: {
    mission: "Chang'e 5",
    massGrams: 1731,
    ageGa: 1.96,
    rockTypes: ['Mare basalt', 'Volcanic glass beads', 'Regolith breccia'],
    description:
      'Returned from the Rümker region of Oceanus Procellarum in December 2020. At ~2 Ga, these are the youngest volcanic samples ever returned from the Moon — approximately 1 billion years younger than any Apollo sample.',
    nasaComparativeRef:
      'NASA comparative analysis: Qian et al. (2021) Science 374, 79. NASA sample catalog cross-reference via JSC Astromaterials.',
  },
  luna24: {
    mission: 'Luna 24',
    massGrams: 170,
    ageGa: 3.3,
    rockTypes: ['Mare basalt core', 'Regolith', 'Impact melt glass'],
    description:
      'Returned a 2-meter drill core from Mare Crisium in August 1976. Re-analysis in 2010 by Saal et al. detected hydroxyl in volcanic glass beads, providing early evidence for water in the lunar interior.',
    nasaComparativeRef:
      'NASA reference: Saal et al. (2008) Nature 454, 192–195. Luna sample archive held at Vernadsky Institute, Moscow.',
  },
}

export async function fetchLunarSamples(locationId: string): Promise<LunarSamplesResponse> {
  const sampleMeta = SAMPLE_META[locationId] ?? null

  if (!sampleMeta) {
    return { images: [], sampleMeta: null }
  }

  let images: NasaImage[] = []
  try {
    images = await fetchNasaImages(`${sampleMeta.mission} lunar samples`)
  } catch {
    // Graceful degradation — static metadata is the primary value
  }

  return { images, sampleMeta }
}
