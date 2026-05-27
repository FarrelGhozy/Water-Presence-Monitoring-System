import { config } from '../config'
import { Observation } from '../models/Observation'
import { SatelliteData } from '../models/SatelliteData'
import { GeminiAnalysis } from '../models/GeminiAnalysis'
import { analyzeSatelliteData } from '../external/gemini'
import { fetchWithTimeout } from '../utils/fetch'
import { logger } from '../utils/logger'
import type { SatelliteDataPayload, GeminiAnalysisResult } from '../types'

const PIPELINE_TIMEOUT_MS = 5 * 60 * 1000

const FALLBACK_ANALYSIS: GeminiAnalysisResult = {
  confidence: 0,
  verdict: 'possible',
  reasoning: 'AI analysis unavailable. Showing raw satellite data.',
  contributingFactors: [],
  anomalies: ['Gemini API was unavailable'],
  recommendations: ['Manual review recommended'],
}

async function fetchSatelliteData(lat: number, lng: number): Promise<SatelliteDataPayload> {
  const res = await fetchWithTimeout(`${config.geeWorkerUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  }, 60_000)

  if (!res.ok) {
    throw new Error(`GEE worker error: ${res.status}`)
  }

  return res.json()
}

export async function processObservation(observationId: string): Promise<void> {
  const startTime = Date.now()

  const timeout = setTimeout(async () => {
    await Observation.updateOne(
      { _id: observationId, status: 'processing' },
      { $set: { status: 'error' } }
    )
  }, PIPELINE_TIMEOUT_MS)

  try {
    await Observation.updateOne({ _id: observationId }, { $set: { status: 'processing' } })

    const obs = await Observation.findById(observationId)
    if (!obs) throw new Error(`Observation ${observationId} not found`)

    const satelliteData = await fetchSatelliteData(obs.latitude, obs.longitude)
    await SatelliteData.create({ observationId, ...satelliteData })

    let geminiResult = FALLBACK_ANALYSIS
    try {
      geminiResult = await analyzeSatelliteData(satelliteData)
    } catch (err) {
      logger.error('Gemini analysis failed', { observationId, error: String(err) })
    }

    await GeminiAnalysis.create({
      observationId,
      ...geminiResult,
      processedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    })

    await Observation.updateOne(
      { _id: observationId },
      { $set: { status: 'completed' } }
    )
  } catch (error) {
    logger.error('Pipeline failed', { observationId, error: String(error) })
    await Observation.updateOne(
      { _id: observationId },
      { $set: { status: 'error' } }
    )
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
