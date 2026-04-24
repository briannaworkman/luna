import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { buildOrbitPrompt } from './orbit-prompt'
import { runSpecialistStream } from './runSpecialistStream'

export async function runOrbitAgent(input: {
  dataContext: DataContext
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { system, user } = buildOrbitPrompt({ dataContext: input.dataContext })
  await runSpecialistStream({
    agent: 'orbit',
    system,
    user,
    citationSource: 'svs',
    forwardConfidence: false,
    emit: input.emit,
  })
}
