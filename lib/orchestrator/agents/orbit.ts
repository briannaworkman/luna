import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { buildOrbitPrompt } from './orbit-prompt'
import { parseInlineTags } from './parseInlineTags'

export async function runOrbitAgent(input: {
  dataContext: DataContext
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { dataContext, emit } = input
  const { system, user } = buildOrbitPrompt({ dataContext })

  try {
    const stream = getAnthropic().messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    })

    let carry = ''
    for await (const ev of stream) {
      if (ev.type !== 'content_block_delta') continue
      if (ev.delta.type !== 'text_delta') continue

      const { parsed, carry: newCarry } = parseInlineTags(ev.delta.text, carry, {
        citationSource: 'svs',
      })
      carry = newCarry

      if (parsed.text.length > 0) {
        emit({ type: 'agent-chunk', agent: 'orbit', text: parsed.text })
      }
      for (const c of parsed.citations) {
        emit({ type: 'agent-citation', agent: 'orbit', source: c.source, id: c.id })
      }
      // Orbit does not use confidence scoring — suppress any [CONFIDENCE:] tags
      // the model may emit despite the system prompt instruction.
    }

    // Flush any trailing carry (prose tail with no closing tag)
    if (carry.length > 0) {
      emit({ type: 'agent-chunk', agent: 'orbit', text: carry })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'agent-error', agent: 'orbit', message })
  }
}
