// URL validation for safe rendering of external URLs from NASA APIs
// Prevents javascript: URLs and other XSS vectors

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'ftp:']);

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    // Reject javascript: and data: URLs
    if (url.startsWith('javascript:') || url.startsWith('data:')) return false;

    // Parse and check protocol
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    // Invalid URL format — reject
    return false;
  }
}

export function sanitizeUrl(url: string | null | undefined): string {
  return isSafeUrl(url) ? (url as string) : '';
}
