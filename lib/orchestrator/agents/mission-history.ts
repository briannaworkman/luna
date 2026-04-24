import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { buildMissionHistoryPrompt } from './mission-history-prompt'
import { runSpecialistStream } from './runSpecialistStream'

export async function runMissionHistoryAgent(input: {
  dataContext: DataContext
  emit: (event: OrchestratorEvent) => void
}): Promise<void> {
  const { system, user } = buildMissionHistoryPrompt({ dataContext: input.dataContext })
  await runSpecialistStream({
    agent: 'mission-history',
    system,
    user,
    citationSource: 'nasa-image',
    forwardConfidence: false,
    emit: input.emit,
  })
}
