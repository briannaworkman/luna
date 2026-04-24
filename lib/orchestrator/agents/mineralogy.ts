import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { buildMineralogyPrompt } from './mineralogy-prompt'
import { runSpecialistStream } from './runSpecialistStream'

export async function runMineralogyAgent(input: {
  dataContext: DataContext
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { system, user } = buildMineralogyPrompt({ dataContext: input.dataContext })
  await runSpecialistStream({
    agent: 'mineralogy',
    system,
    user,
    citationSource: 'jsc-sample',
    forwardConfidence: true,
    emit: input.emit,
  })
}
