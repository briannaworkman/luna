import type { AgentId } from '@/lib/constants/agents'
import type { BriefSection, Finding } from '@/lib/types/brief'

// Map from agentId to topic
export const AGENT_TOPIC_MAP: Partial<Record<AgentId, string>> = {
  'mineralogy':      'Geology',
  'imagery':         'Surface imagery',
  'mission-history': 'Mission history',
  'orbit':           'Orbital considerations',
}

// Canonical display order for topics
export const TOPIC_ORDER: string[] = [
  'Geology',
  'Surface imagery',
  'Mission history',
  'Orbital considerations',
]

export interface TopicGroup {
  topic: string
  findings: Array<Finding & { agentId: string; agentName: string }>
}

/**
 * Groups findings from sections into thematic topic buckets.
 * Stub agents (unmapped) are excluded.
 * Preserves TOPIC_ORDER ordering.
 */
export function groupFindingsByTopic(sections: BriefSection[]): TopicGroup[] {
  const buckets = new Map<string, Array<Finding & { agentId: string; agentName: string }>>()

  // Initialize in canonical order
  for (const topic of TOPIC_ORDER) {
    buckets.set(topic, [])
  }

  for (const section of sections) {
    const topic = AGENT_TOPIC_MAP[section.agentId as AgentId]
    if (!topic) continue // unmapped / stub agent — skip

    const bucket = buckets.get(topic) ?? []
    for (const finding of section.findings) {
      bucket.push({ ...finding, agentId: section.agentId, agentName: section.agentName })
    }
    buckets.set(topic, bucket)
  }

  const result: TopicGroup[] = []
  for (const topic of TOPIC_ORDER) {
    const findings = buckets.get(topic) ?? []
    if (findings.length > 0) {
      result.push({ topic, findings })
    }
  }
  return result
}
