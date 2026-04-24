import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchImageBase64 } from './fetchImageBase64'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeArrayBuffer(bytes: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) {
    view[i] = bytes[i] ?? 0
  }
  return buf
}

function expectedBase64(bytes: number[]): string {
  return Buffer.from(makeArrayBuffer(bytes)).toString('base64')
}

describe('fetchImageBase64', () => {
  it('JPEG happy path — content-type image/jpeg returns jpeg mediaType and correct base64', async () => {
    const bytes = [0xff, 0xd8, 0x01, 0x02]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => h === 'content-type' ? 'image/jpeg' : null },
      arrayBuffer: async () => makeArrayBuffer(bytes),
    }))

    const result = await fetchImageBase64('https://example.com/photo.jpg')
    expect(result.mediaType).toBe('image/jpeg')
    expect(result.data).toBe(expectedBase64(bytes))
  })

  it('PNG via content-type header returns png mediaType', async () => {
    const bytes = [0x89, 0x50, 0x4e, 0x47]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => makeArrayBuffer(bytes),
    }))

    const result = await fetchImageBase64('https://example.com/image.jpg')
    expect(result.mediaType).toBe('image/png')
    expect(result.data).toBe(expectedBase64(bytes))
  })

  it('PNG via URL extension (no content-type) returns png mediaType', async () => {
    const bytes = [0x89, 0x50, 0x4e, 0x47]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (_h: string) => null },
      arrayBuffer: async () => makeArrayBuffer(bytes),
    }))

    const result = await fetchImageBase64('https://example.com/photo.png')
    expect(result.mediaType).toBe('image/png')
    expect(result.data).toBe(expectedBase64(bytes))
  })

  it('non-ok response (404) throws with HTTP status message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: (_h: string) => null },
    }))

    await expect(fetchImageBase64('https://example.com/missing.jpg')).rejects.toThrow('HTTP 404')
  })

  it('timeout throws when fetch never resolves within timeoutMs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }
        // never resolves on its own
      })
    }))

    await expect(fetchImageBase64('https://example.com/slow.jpg', 50)).rejects.toThrow()
  })
})
