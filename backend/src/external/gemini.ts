import { config } from '../config'
import { ExternalApiError } from '../middleware/error'
import type { SatelliteDataPayload, GeminiAnalysisResult } from '../types'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function buildPrompt(data: SatelliteDataPayload): string {
  return `You are a hydrology and remote sensing analyst. Analyze this satellite data and respond ONLY in valid JSON with fields: confidence (0-100 number), verdict ("definitive"|"probable"|"possible"|"unlikely"), reasoning (string), recommendations (array of strings).

SATELLITE DATA INPUT:
${JSON.stringify(data, null, 2)}`
}

function parseResponse(raw: string): GeminiAnalysisResult {
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function analyzeSatelliteData(
  data: SatelliteDataPayload
): Promise<GeminiAnalysisResult> {
  const response = await fetch(`${GEMINI_URL}?key=${config.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(data) }] }],
    }),
  })

  if (!response.ok) {
    throw new ExternalApiError(
      `Gemini API error: ${response.status}`,
      'gemini'
    )
  }

  const json = await response.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new ExternalApiError('Gemini returned empty response', 'gemini')
  }

  try {
    return parseResponse(text)
  } catch {
    throw new ExternalApiError('Failed to parse Gemini response', 'gemini')
  }
}
