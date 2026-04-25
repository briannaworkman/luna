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

export interface IlluminationWindow {
  date: string;              // YYYY-MM-DD UTC
  sunriseUtc: string | null; // ISO 8601 — null when permanentlyShadowed
  sunsetUtc: string | null;  // ISO 8601 — null when permanentlyShadowed
  illuminatedHours: number;
  solarElevationDeg: number; // peak solar elevation for the day
  permanentlyShadowed: boolean;
}

export interface IlluminationWindowsErrorResponse {
  error: string;
  code: 'FETCH_FAILED' | 'INVALID_PARAMS';
}

export interface LampProduct {
  productId: string;
  resolutionMpp: number;
  acquisitionDate: string;
  downloadUrl: string;
}

export interface PsrSummary {
  locationId: string;
  locationName: string;
  iceConfidence: 'confirmed' | 'probable' | 'candidate';
  detectionMethods: string[];
  estimatedIcePct: string;
  notes: string;
}

export interface PsrDataResponse {
  lampProducts: LampProduct[];
  psrSummary: PsrSummary | null;
}

export interface PsrDataErrorResponse {
  error: string;
  code: 'TIMEOUT' | 'UPSTREAM_ERROR' | 'INVALID_PARAMS';
  lampProducts: LampProduct[];
  psrSummary: PsrSummary | null;
}

export interface LunarSampleMeta {
  mission: string;
  massGrams: number;
  ageGa: number;
  rockTypes: string[];
  description: string;
  nasaComparativeRef: string;
}

export interface LunarSamplesResponse {
  images: NasaImage[];
  sampleMeta: LunarSampleMeta | null;
}

export interface LunarSamplesErrorResponse {
  error: string;
  code: 'INVALID_PARAMS';
  images: NasaImage[];
  sampleMeta: null;
}
