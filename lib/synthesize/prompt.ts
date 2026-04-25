import { AGENTS } from '@/lib/constants/agents'
import type { DataCompleteness } from './completeness'

// ---------------------------------------------------------------------------
// Stub agent IDs and data-ingest ID — must be excluded from synthesis
// ---------------------------------------------------------------------------

const STUB_AGENT_IDS = new Set(
  AGENTS.filter((a) => a.isStub).map((a) => a.id)
)
const DATA_INGEST_ID = 'data-ingest'

function isExcluded(id: string): boolean {
  return id === DATA_INGEST_ID || STUB_AGENT_IDS.has(id as never)
}

// ---------------------------------------------------------------------------
// System prompt (verbatim from blueprint)
// ---------------------------------------------------------------------------

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
- summary: one paragraph (3–5 sentences) synthesizing the most important finding from each active agent into a coherent narrative for a non-specialist
- sections: one per active specialist agent (exclude data-ingest; exclude stub agents thermal, topography, hazards)
- agentId: exact AgentId string (e.g. "mineralogy")
- agentName: human-readable label (e.g. "Mineralogy")
- claim: one factual declarative sentence — no hedging preamble, no bundling
- corroboratedBy: AgentId strings of OTHER agents that made a similar claim independently. Empty array if none. NEVER include the current section's own agentId.
- citations: asset IDs referenced by [CITE:...] tags in the agent output that support this specific claim. Use exact IDs — do not invent.
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

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

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

  // Resolve agent name from AGENTS constant
  const agentLabelMap = new Map(AGENTS.map((a) => [a.id, a.label]))

  // Filter out excluded agents for both the activeAgents list and the sections
  const filteredActiveAgents = activeAgents.filter((id) => !isExcluded(id))

  const locationLine =
    `${locationName}` + (isProposed ? ' (proposed name, pending IAU approval)' : '')

  const latStr = `${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon)}°${lon >= 0 ? 'E' : 'W'}`

  // Build data completeness section
  const completenessLines = [
    `LROC NAC: ${completeness['LROC NAC']}`,
    `LROC WAC: ${completeness['LROC WAC']}`,
    `JSC Samples: ${completeness['JSC Samples']}`,
    `SVS Illumination: ${completeness['SVS Illumination']}`,
    `NASA Image Library: ${completeness['NASA Image Library']}`,
  ].join('\n')

  // Build agent outputs section — only agents with actual output
  const agentSections = filteredActiveAgents
    .filter((id) => id in agentOutputs && agentOutputs[id] !== '')
    .map((id) => {
      const label = agentLabelMap.get(id as never) ?? id
      return `--- AGENT: ${id} (${label}) ---\n${agentOutputs[id]}`
    })
    .join('\n\n')

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

${agentSections}`

  return {
    system: SYNTHESIS_SYSTEM_PROMPT,
    user,
  }
}
