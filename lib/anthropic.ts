import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-opus-4-7' as const

let _client: Anthropic | undefined

export function getAnthropic(): Anthropic {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey: key })
  return _client
}
