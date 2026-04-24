export async function fetchImageBase64(
  url: string,
  timeoutMs = 10_000,
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const buf = await response.arrayBuffer()
    const data = Buffer.from(buf).toString('base64')

    const contentType = response.headers.get('content-type') ?? ''
    let mediaType: 'image/jpeg' | 'image/png'
    if (contentType.includes('image/png')) {
      mediaType = 'image/png'
    } else if (url.endsWith('.png')) {
      mediaType = 'image/png'
    } else {
      mediaType = 'image/jpeg'
    }

    return { data, mediaType }
  } finally {
    clearTimeout(timer)
  }
}
