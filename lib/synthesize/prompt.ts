import { AGENTS, type AgentId } from '@/lib/constants/agents'
import { COMPLETENESS_SOURCES } from '@/lib/types/brief'
import type { DataCompleteness } from './completeness'

const STUB_AGENT_IDS = new Set<AgentId>(
  AGENTS.filter((a) => a.isStub).map((a) => a.id),
)
const DATA_INGEST_ID: AgentId = 'data-ingest'
const AGENT_LABEL_MAP = new Map<AgentId, string>(
  AGENTS.map((a) => [a.id, a.label]),
)

function isExcluded(id: string): boolean {
  return id === DATA_INGEST_ID || STUB_AGENT_IDS.has(id as AgentId)
}

export const SYNTHESIS_SYSTEM_PROMPT = `You are the synthesis engine for LUNA (Lunar Unified Navigation & Analysis), a multi-agent lunar research system. Your audience is science journalists, space creators, and undergraduate planetary science students.

## Your Role

You receive the complete output of multiple specialist agents that have independently analyzed a single lunar location. Your task is to synthesize — not summarize — their findings into a structured mission brief. Synthesizing means: cross-referencing claims across agents, identifying corroborations and contradictions, assigning per-claim confidence scores based on the evidence weight visible in the agent outputs, and producing a document that stands alone without requiring the reader to have seen the agent stream.

## Output Requirement

You MUST produce a single valid JSON object that conforms exactly to the following schema. Do not produce any text before or after the JSON object. Do not wrap it in markdown code fences. Do not add commentary.

Schema:
{
  "locationName": string,
  "query": string,
  "generatedAt": string,
  "summary": string,
  "sections": [
    {
      "agentId": string,
      "agentName": string,
      "findings": [
        {
          "claim": string,
          "confidence": "High" | "Medium" | "Low",
          "corroboratedBy": string[],
          "citations": string[]
        }
      ]
    }
  ],
  "followUpQueries": [string, string, string],
  "dataCompleteness": {
    "LROC NAC": "Confirmed" | "Partial" | "Analogue only" | "Incomplete",
    "LROC WAC": "Confirmed" | "Partial" | "Analogue only" | "Incomplete",
    "JSC Samples": "Confirmed" | "Partial" | "Analogue only" | "Incomplete",
    "SVS Illumination": "Confirmed" | "Partial" | "Analogue only" | "Incomplete",
    "NASA Image Library": "Confirmed" | "Partial" | "Analogue only" | "Incomplete"
  }
}

Field requirements:
- generatedAt: use the exact ISO 8601 UTC value provided to you in the user message
- summary: 2–3 paragraphs (separated by blank lines) that DIRECTLY ANSWER the user's query. Lead with the most authoritative answer, then weave in the most important supporting findings drawn from across the active agents' outputs. Write for a non-specialist who has not seen the agent stream — this is the standalone answer the user reads first. Use plain prose; do NOT include inline tags, markdown headers, or bullet lists. Roughly 8–14 sentences total.
- sections: one per active specialist agent (exclude data-ingest; exclude stub agents thermal, topography, hazards)
- agentId: exact AgentId string (e.g. "mineralogy")
- agentName: human-readable label (e.g. "Mineralogy")
- claim: one factual declarative sentence — no hedging preamble, no bundling
- corroboratedBy: AgentId strings of OTHER agents that made a similar claim independently. Empty array if none. NEVER include the current section's own agentId.
- citations: asset IDs referenced in the agent output that support this specific claim. Note: inline [CITE:...] tags have been stripped from agent output before it reaches you. Each agent's section may end with a structured line of the form "Citations: source:id, source:id, ..." listing the asset IDs that came up during that agent's analysis. Populate this field using those IDs. Use exact IDs — do not invent.
- followUpQueries: exactly 3 complete questions (not topic labels)
- dataCompleteness: echo the 5 values exactly as provided in the user message

## Confidence Rubric

- High: claim supported by two or more active, non-stub agents independently, OR by direct primary source data (an actual LROC product, an actual JSC sample record, an actual SVS illumination window).
- Medium: claim supported by exactly one agent with a primary source citation, OR claim relies on analogue reasoning from nearby data rather than data for this exact location.
- Low: claim inferred from general geological knowledge with no direct data support for this specific location.

The stub agents — thermal, topography, hazards — produced no output and must NEVER appear in corroboratedBy arrays, sections, or any part of the brief. Their absence must not lower confidence scores for claims that would otherwise qualify as High or Medium.

## Claim Extraction

- Extract 3–6 findings per agent section. More findings are acceptable if the agent output is dense with distinct, citable claims.
- Each finding is one atomic claim. Do not bundle multiple facts into one finding object.
- If agents contradict, produce both claims as separate findings; assign Low to whichever is less directly supported.
- Do not fabricate claims not present in the agent output.

## Follow-Up Queries

Three complete questions. Example shape: "How does the regolith composition here compare to the Apollo 16 landing site?" — not "Regolith comparison".`

interface BuildSynthesisPromptInput {
  locationName: string
  lat: number
  lon: number
  isProposed: boolean
  query: string
  generatedAt: string
  completeness: DataCompleteness
  activeAgents: string[]
  agentOutputs: Record<string, string>
}

export function buildSynthesisPrompt(input: BuildSynthesisPromptInput): {
  system: string
  user: string
} {
  const {
    locationName,
    lat,
    lon,
    isProposed,
    query,
    generatedAt,
    completeness,
    activeAgents,
    agentOutputs,
  } = input

  const filteredActiveAgents = activeAgents.filter((id) => !isExcluded(id))

  const locationLine = isProposed
    ? `${locationName} (proposed name, pending IAU approval)`
    : locationName
  const latStr = `${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon)}°${lon >= 0 ? 'E' : 'W'}`

  const completenessLines = COMPLETENESS_SOURCES
    .map((source) => `${source}: ${completeness[source]}`)
    .join('\n')

  const agentSections: string[] = []
  for (const id of filteredActiveAgents) {
    const text = agentOutputs[id]
    if (!text) continue
    const label = AGENT_LABEL_MAP.get(id as AgentId) ?? id
    agentSections.push(`--- AGENT: ${id} (${label}) ---\n${text}`)
  }

  const user = `SYNTHESIS REQUEST
=================
Location: ${locationLine}
Coordinates: ${latStr}, ${lonStr}
Query: ${query}
Generated at (use this exact value in your output): ${generatedAt}

DATA COMPLETENESS (echo these values exactly in your output)
============================================================
${completenessLines}

ACTIVE AGENTS
=============
${filteredActiveAgents.join(', ')}

AGENT OUTPUTS
=============

${agentSections.join('\n\n')}`

  return { system: SYNTHESIS_SYSTEM_PROMPT, user }
}
