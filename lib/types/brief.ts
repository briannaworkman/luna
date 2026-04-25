import { z } from 'zod'

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

export const COMPLETENESS_SOURCES = [
  'LROC NAC',
  'LROC WAC',
  'JSC Samples',
  'SVS Illumination',
  'NASA Image Library',
] as const

export type CompletenessSource = (typeof COMPLETENESS_SOURCES)[number]

export const CompletenessStatusSchema = z.enum([
  'Confirmed',
  'Partial',
  'Analogue only',
  'Incomplete',
])

export type CompletenessStatus = z.infer<typeof CompletenessStatusSchema>

// ---------------------------------------------------------------------------
// Core finding / section
// ---------------------------------------------------------------------------

export const FindingSchema = z.object({
  claim: z.string(),
  confidence: z.enum(['High', 'Medium', 'Low']),
  corroboratedBy: z.array(z.string()),
  citations: z.array(z.string()),
})

export type Finding = z.infer<typeof FindingSchema>

export const BriefSectionSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  findings: z.array(FindingSchema),
})

export type BriefSection = z.infer<typeof BriefSectionSchema>

// ---------------------------------------------------------------------------
// MissionBrief
// ---------------------------------------------------------------------------

export const MissionBriefSchema = z.object({
  locationName: z.string(),
  query: z.string(),
  /** ISO 8601 UTC timestamp of the synthesis call */
  generatedAt: z.string().min(1),
  summary: z.string(),
  sections: z.array(BriefSectionSchema),
  /** Exactly 3 complete follow-up questions */
  followUpQueries: z.array(z.string()).length(3),
  /** Keys are data source names, values are coverage status */
  dataCompleteness: z.record(z.string(), CompletenessStatusSchema),
})

export type MissionBrief = z.infer<typeof MissionBriefSchema>

// ---------------------------------------------------------------------------
// SSE stream events
// ---------------------------------------------------------------------------

export type BriefStreamEvent =
  | { type: 'partial'; text: string }
  | { type: 'complete'; brief: MissionBrief }
  | { type: 'error'; message: string; partial: Partial<MissionBrief> | undefined }
