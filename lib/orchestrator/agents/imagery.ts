import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { NasaImage } from '@/lib/types/agent'
import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { parseInlineTags } from './parseInlineTags'
import { fetchImageBase64 } from './fetchImageBase64'
import {
  buildPerImagePrompt,
  buildSynthesisPrompt,
  IMAGERY_SYNTHESIS_SYSTEM_PROMPT,
} from './imagery-prompt'

/**
 * Consume a streaming Anthropic response, parse inline [CITE]/[CONFIDENCE] tags,
 * and emit chunks + citations to the orchestrator. Shared between per-image
 * analysis and synthesis — both have identical stream shapes (text_delta with
 * nasa-image citations, confidence tags stripped).
 */
async function consumeStreamWithTagParsing(
  stream: MessageStream,
  emit: (event: OrchestratorEvent) => void,
): Promise<void> {
  let carry = ''
  for await (const ev of stream) {
    if (ev.type !== 'content_block_delta') continue
    if (ev.delta.type !== 'text_delta') continue

    const { segments, carry: newCarry } = parseInlineTags(ev.delta.text, carry, {
      citationSource: 'nasa-image',
    })
    carry = newCarry

    for (const seg of segments) {
      if (seg.kind === 'text') {
        emit({ type: 'agent-chunk', agent: 'imagery', text: seg.text })
      } else if (seg.kind === 'citation') {
        emit({ type: 'agent-citation', agent: 'imagery', source: seg.source, id: seg.id })
      }
      // Confidence segments are stripped by parseInlineTags and never
      // forwarded from the imagery agent.
    }
  }

  // Flush trailing carry
  if (carry.length > 0) {
    emit({ type: 'agent-chunk', agent: 'imagery', text: carry })
  }
}

export async function runImageryAgent(input: {
  dataContext: DataContext
  imageAssetIds: string[]
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { dataContext, imageAssetIds, emit } = input

  if (imageAssetIds.length === 0) {
    return
  }

  if (dataContext.nasaImages === null) {
    emit({
      type: 'agent-chunk',
      agent: 'imagery',
      text: 'Unable to locate selected images in NASA archive.\n',
    })
    return
  }

  // Match imageAssetIds against nasaImages, preserving user-chosen order
  const imageMap = new Map<string, NasaImage>()
  for (const img of dataContext.nasaImages) {
    imageMap.set(img.assetId, img)
  }

  const matchedImages: NasaImage[] = []
  for (const assetId of imageAssetIds) {
    const img = imageMap.get(assetId)
    if (img !== undefined) {
      matchedImages.push(img)
    }
  }

  if (matchedImages.length === 0) {
    emit({
      type: 'agent-chunk',
      agent: 'imagery',
      text: `Unable to match ${imageAssetIds.length} selected image(s) against the NASA archive data for this location.\n`,
    })
    return
  }

  const fetched: Array<{ image: NasaImage; data: string; mediaType: 'image/jpeg' | 'image/png' }> = []

  for (let i = 0; i < matchedImages.length; i++) {
    const image = matchedImages[i]
    if (image === undefined) continue

    let fetchedData: string
    let fetchedMediaType: 'image/jpeg' | 'image/png'

    try {
      const result = await fetchImageBase64(image.fullUrl)
      fetchedData = result.data
      fetchedMediaType = result.mediaType
    } catch {
      emit({
        type: 'agent-chunk',
        agent: 'imagery',
        text: `Unable to fetch ${image.assetId} — skipped.\n`,
      })
      continue
    }

    const { system, userText, headerLine } = buildPerImagePrompt({
      location: dataContext.location,
      image,
      index: i + 1,
      total: matchedImages.length,
    })

    emit({ type: 'agent-chunk', agent: 'imagery', text: headerLine })

    let streamSucceeded = false
    try {
      const stream = getAnthropic().messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: fetchedMediaType,
                  data: fetchedData,
                },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      })

      await consumeStreamWithTagParsing(stream, emit)
      streamSucceeded = true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      emit({ type: 'agent-error', agent: 'imagery', message })
      // Continue to next image — stream error is isolated per-image
    }

    // Only images whose per-image analysis completed count toward synthesis.
    // Fetch+emit without successful streaming doesn't produce useful output
    // for the synthesis model to reason over.
    if (streamSucceeded) {
      fetched.push({ image, data: fetchedData, mediaType: fetchedMediaType })
    }

    emit({ type: 'agent-chunk', agent: 'imagery', text: '\n\n---\n\n' })
  }

  if (fetched.length >= 2) {
    emit({
      type: 'agent-chunk',
      agent: 'imagery',
      text: `\n\nSynthesis across ${fetched.length} images\n`,
    })

    const { user } = buildSynthesisPrompt({
      location: dataContext.location,
      images: fetched.map((f) => f.image),
    })

    const content: Array<
      | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png'; data: string } }
      | { type: 'text'; text: string }
    > = [
      ...fetched.map((f) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: f.mediaType,
          data: f.data,
        },
      })),
      { type: 'text', text: user },
    ]

    try {
      const synthStream = getAnthropic().messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        system: IMAGERY_SYNTHESIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      })

      await consumeStreamWithTagParsing(synthStream, emit)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      emit({ type: 'agent-error', agent: 'imagery', message })
      return
    }
  }
}
