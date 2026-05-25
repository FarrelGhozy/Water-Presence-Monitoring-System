import { config } from '../config'
import { Observation } from '../models/Observation'
import { SatelliteData } from '../models/SatelliteData'
import { GeminiAnalysis } from '../models/GeminiAnalysis'
import { analyzeSatelliteData } from '../external/gemini'
import type { SatelliteDataPayload, GeminiAnalysisResult } from '../types'

const FALLBACK_ANALYSIS: GeminiAnalysisResult = {
  confidence: 0,
  verdict: 'possible',
  reasoning: 'AI analysis unavailable. Showing raw satellite data.',
  contributingFactors: [],
  anomalies: ['Gemini API was unavailable'],
  recommendations: ['Manual review recommended'],
}

async function fetchSatelliteData(lat: number, lng: number): Promise<SatelliteDataPayload> {
  const res = await fetch(`${config.geeWorkerUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ lat, lng }),
  })

  if (!res.ok) {
    throw new Error(`GEE worker error: ${res.status}`)
  }

  return res.json()
}

export async function processObservation(observationId: string): Promise<void> {
  const startTime = Date.now()

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
      console.error(`Gemini failed for ${observationId}:`, err)
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
    console.error(`Pipeline failed for ${observationId}:`, error)
    await Observation.updateOne(
      { _id: observationId },
      { $set: { status: 'error' } }
    )
    throw error
  }
}
