import type { AgentId } from '@/lib/constants/agents'
import type { OrchestratorEvent } from '@/lib/types/agent'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { parseInlineTags, type CitationSource } from './parseInlineTags'

/**
 * Shared stream consumer for prose-generating specialists (mineralogy,
 * mission-history, orbit). Opens a Claude messages stream, forwards
 * parsed text and inline [CITE:]/[CONFIDENCE:] tags as OrchestratorEvents,
 * and surfaces stream failures as agent-error rather than throwing.
 *
 * Imagery (PR 9) is expected to have a different shape (sequential
 * per-image blocks + synthesis) and is not a target of this helper.
 */
export async function runSpecialistStream(opts: {
  agent: AgentId
  system: string
  user: string
  citationSource: CitationSource
  forwardConfidence: boolean
  emit: (event: OrchestratorEvent) => void
  maxTokens?: number
}): Promise<void> {
  const { agent, system, user, citationSource, forwardConfidence, emit } = opts
  const maxTokens = opts.maxTokens ?? 1500

  try {
    const stream = getAnthropic().messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    })

    let carry = ''
    for await (const ev of stream) {
      if (ev.type !== 'content_block_delta') continue
      if (ev.delta.type !== 'text_delta') continue

      const { parsed, carry: newCarry } = parseInlineTags(ev.delta.text, carry, {
        citationSource,
      })
      carry = newCarry

      if (parsed.text.length > 0) {
        emit({ type: 'agent-chunk', agent, text: parsed.text })
      }
      for (const c of parsed.citations) {
        emit({ type: 'agent-citation', agent, source: c.source, id: c.id })
      }
      if (forwardConfidence) {
        for (const c of parsed.confidences) {
          emit({ type: 'agent-confidence', agent, level: c.level })
        }
      }
      // When forwardConfidence is false, any [CONFIDENCE:] tags the model
      // emits despite the system prompt instruction are still stripped
      // from text by parseInlineTags — we simply drop the parsed events.
    }

    // Flush any trailing carry (prose tail with no closing tag)
    if (carry.length > 0) {
      emit({ type: 'agent-chunk', agent, text: carry })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'agent-error', agent, message })
  }
}
