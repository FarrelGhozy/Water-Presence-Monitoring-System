import { config } from '../config'
import { ExternalApiError } from '../middleware/error'
import { fetchWithTimeout } from '../utils/fetch'
import type { SatelliteDataPayload, GeminiAnalysisResult } from '../types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

function buildPrompt(data: SatelliteDataPayload): string {
  return `You are a hydrology and remote sensing analyst. Analyze this satellite data and respond ONLY in valid JSON with fields: confidence (0-100 number), verdict ("definitive"|"probable"|"possible"|"unlikely"), reasoning (string), contributingFactors (array of strings), anomalies (array of strings), recommendations (array of strings).

SATELLITE DATA INPUT:
${JSON.stringify(data, null, 2)}`
}

function parseResponse(raw: string): GeminiAnalysisResult {
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    confidence: parsed.confidence,
    verdict: parsed.verdict,
    reasoning: parsed.reasoning,
    contributingFactors: parsed.contributingFactors || [],
    anomalies: parsed.anomalies || [],
    recommendations: parsed.recommendations || [],
  }
}

export async function analyzeSatelliteData(
  data: SatelliteDataPayload
): Promise<GeminiAnalysisResult> {
  const response = await fetchWithTimeout(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/fazy/water-presence',
      'X-Title': 'Water Presence Monitoring',
    },
    body: JSON.stringify({
      model: config.aiModel,
      messages: [{ role: 'user', content: buildPrompt(data) }],
      response_format: { type: 'json_object' },
    }),
  }, 15_000)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new ExternalApiError(
      `OpenRouter API error: ${response.status} ${errorBody}`,
      'openrouter'
    )
  }

  const json = await response.json()
  const text = json?.choices?.[0]?.message?.content

  if (!text) {
    throw new ExternalApiError('OpenRouter returned empty response', 'openrouter')
  }

  try {
    return parseResponse(text)
  } catch {
    throw new ExternalApiError('Failed to parse OpenRouter response', 'openrouter')
  }
}
