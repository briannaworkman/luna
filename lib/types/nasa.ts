// NASA Image & Video Library types
// This is a public API contract read by downstream agents (Foxtrot, Delta).
// Do not change field names or nullability without flagging as a breaking change.

export interface NasaImage {
  assetId: string;
  thumbUrl: string;
  fullUrl: string;
  instrument: string;
  date: string; // ISO 8601 string
  nasaUrl: string;
}

export interface NasaImagesResponse {
  images: NasaImage[];
  limitedCoverage: boolean;
}

export interface LrocProduct {
  productId: string;
  resolutionMpp: number;
  acquisitionDate: string; // ISO 8601 string
  downloadUrl: string;
  instrument: string;
}

export interface LrocResponse {
  wac: LrocProduct[];
  nac: LrocProduct[];
}

export interface LrocErrorResponse {
  error: string;
  code: 'TIMEOUT' | 'UPSTREAM_ERROR';
  results: LrocProduct[];
}

// Public API contract — do not change field names or nullability without flagging as a breaking change.

export interface JscSample {
  sampleId: string;
  mission: string;
  station: string;
  weightGrams: number | null;
  mineralFlags: string[];
  description: string | null;
  jscUrl: string;
}

export interface JscSamplesResponse {
  results: JscSample[];
  nearestMission: string | null;
}

export interface JscSamplesErrorResponse {
  error: string;
  code: 'TIMEOUT' | 'UPSTREAM_ERROR';
  results: JscSample[];
  nearestMission: null;
}

// Public API contract — do not change field names or nullability without flagging as a breaking change.

export interface SvsIlluminationEntry {
  time: string;       // e.g. "01 Jan 2026 00:00 UT"
  phase: number;      // illumination phase percentage (0–100)
  age: number;
  diameter: number;   // apparent diameter in arcseconds
  distance: number;   // Earth–Moon distance in km
  j2000: { ra: number; dec: number };
  subsolar: { lon: number; lat: number };  // selenographic lon/lat of subsolar point
  subearth: { lon: number; lat: number };  // selenographic lon/lat of subearth point
  posangle: number;   // position angle of the Moon's axis in degrees
}

export interface SvsIlluminationResponse {
  entries: SvsIlluminationEntry[];
  source: string;
}

export interface SvsIlluminationErrorResponse {
  error: string;
  code: 'FETCH_FAILED';
}
