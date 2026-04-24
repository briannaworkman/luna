import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { buildMineralogyPrompt } from './mineralogy-prompt'
import { parseInlineTags } from './parseInlineTags'

export async function runMineralogyAgent(input: {
  dataContext: DataContext
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { dataContext, emit } = input
  const { system, user } = buildMineralogyPrompt({ dataContext })

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
        citationSource: 'jsc-sample',
      })
      carry = newCarry

      if (parsed.text.length > 0) {
        emit({ type: 'agent-chunk', agent: 'mineralogy', text: parsed.text })
      }
      for (const c of parsed.citations) {
        emit({ type: 'agent-citation', agent: 'mineralogy', source: c.source, id: c.id })
      }
      for (const c of parsed.confidences) {
        emit({ type: 'agent-confidence', agent: 'mineralogy', level: c.level })
      }
    }

    // Flush any trailing carry (prose tail with no closing tag)
    if (carry.length > 0) {
      emit({ type: 'agent-chunk', agent: 'mineralogy', text: carry })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'agent-error', agent: 'mineralogy', message })
  }
}
