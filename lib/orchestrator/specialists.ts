import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { runStubAgent } from './stub-agents'
import { runImageryAgent } from './agents/imagery'
import { runSpecialistStream } from './agents/runSpecialistStream'
import { buildMineralogyPrompt } from './agents/mineralogy-prompt'
import { buildOrbitPrompt } from './agents/orbit-prompt'
import { buildMissionHistoryPrompt } from './agents/mission-history-prompt'
import type { CitationSource } from './agents/parseInlineTags'

export interface SpecialistContext {
  dataContext: DataContext
  imageAssetIds: string[]
}

interface ProseSpecialistConfig {
  buildPrompt: (opts: { dataContext: DataContext }) => { system: string; user: string }
  citationSource: CitationSource
  forwardConfidence: boolean
}

const PROSE_SPECIALIST_CONFIG: Partial<Record<AgentId, ProseSpecialistConfig>> = {
  mineralogy:        { buildPrompt: buildMineralogyPrompt,     citationSource: 'jsc-sample',  forwardConfidence: true  },
  orbit:             { buildPrompt: buildOrbitPrompt,          citationSource: 'svs',         forwardConfidence: false },
  'mission-history': { buildPrompt: buildMissionHistoryPrompt, citationSource: 'nasa-image',  forwardConfidence: false },
}

export async function runSpecialist(
  agentId: AgentId,
  context: SpecialistContext,
  emit: (event: OrchestratorEvent) => void,
): Promise<void> {
  const { dataContext, imageAssetIds } = context

  const agent = AGENTS.find((a) => a.id === agentId)
  if (!agent) return

  if (agent.isStub) {
    void runStubAgent(agentId, emit)
    return
  }

  if (agentId === 'imagery') {
    await runImageryAgent({ dataContext, imageAssetIds, emit })
    return
  }

  const config = PROSE_SPECIALIST_CONFIG[agentId]
  if (!config) return

  const { system, user } = config.buildPrompt({ dataContext })
  await runSpecialistStream({
    agent: agentId,
    system,
    user,
    citationSource: config.citationSource,
    forwardConfidence: config.forwardConfidence,
    emit,
  })
}
