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
