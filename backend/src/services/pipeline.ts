import { config } from '../config'
import { Observation } from '../models/Observation'
import { SatelliteData } from '../models/SatelliteData'
import { GeminiAnalysis } from '../models/GeminiAnalysis'
import { RegionalIndex } from '../models/RegionalIndex'
import { analyzeSatelliteData } from '../external/openrouter'
import { fetchWithTimeout } from '../utils/fetch'
import { latLngToProvince } from '../utils/geocode'
import { logger } from '../utils/logger'
import type { SatelliteDataPayload, GeminiAnalysisResult } from '../types'

const PIPELINE_TIMEOUT_MS = 2 * 60 * 1000

function ruleBasedAnalysis(data: SatelliteDataPayload): GeminiAnalysisResult {
  const sar = data.sar
  const ndwi = data.ndwi
  const chirps = data.chirps
  const elevation = data.elevation

  const waterIndicators: string[] = []
  const dryIndicators: string[] = []
  const anomalies: string[] = []

  let waterScore = 0
  let maxScore = 0

  if (sar.waterPercentage !== null) {
    maxScore += 40
    if (sar.waterPercentage > 50) { waterScore += 36; waterIndicators.push('SAR menunjukkan genangan air luas') }
    else if (sar.waterPercentage > 20) { waterScore += 28; waterIndicators.push('SAR mendeteksi genangan air sedang') }
    else if (sar.waterPercentage > 5) { waterScore += 16; waterIndicators.push('SAR mendeteksi genangan air kecil') }
    else { waterScore += 4; dryIndicators.push('SAR tidak mendeteksi genangan signifikan') }
  } else {
    maxScore += 10
    anomalies.push('Data SAR tidak tersedia (mungkin terhalang awan tebal)')
  }

  if (ndwi.available && ndwi.value !== null) {
    maxScore += 30
    if (ndwi.value > 0.3) { waterScore += 27; waterIndicators.push('NDWI tinggi mengindikasikan keberadaan air') }
    else if (ndwi.value > 0) { waterScore += 18; waterIndicators.push('NDWI positif mengindikasikan kelembaban') }
    else if (ndwi.value > -0.2) { waterScore += 9; dryIndicators.push('NDWI sedikit negatif (permukaan kering atau vegetasi)') }
    else { waterScore += 3; dryIndicators.push('NDWI sangat negatif (permukaan kering)') }
  } else {
    maxScore += 10
    anomalies.push('Data NDWI tidak tersedia (awan menutupi area)')
  }

  if (chirps.rainfall7day_mm > 0) {
    maxScore += 15
    if (chirps.rainfall7day_mm > 100) { waterScore += 14; waterIndicators.push('Curah hujan 7 hari sangat tinggi') }
    else if (chirps.rainfall7day_mm > 50) { waterScore += 10; waterIndicators.push('Curah hujan 7 hari tinggi') }
    else { waterScore += 6; waterIndicators.push('Curah hujan ringan dalam 7 hari') }
  } else {
    maxScore += 5
    dryIndicators.push('Tidak ada curah hujan signifikan dalam 7 hari')
  }

  if (elevation.meters < 50) {
    maxScore += 10
    waterScore += 7
    waterIndicators.push('Area dataran rendah (potensi genangan)')
  } else if (elevation.meters < 200) {
    maxScore += 10
    waterScore += 3
    dryIndicators.push('Area berbukit dengan drainase baik')
  } else {
    maxScore += 10
    dryIndicators.push('Area pegunungan dengan drainase cepat')
  }

  const pct = maxScore > 0 ? Math.round((waterScore / maxScore) * 100) : 0

  let verdict: GeminiAnalysisResult['verdict'] = 'possible'
  if (pct >= 65) verdict = 'definitive'
  else if (pct >= 40) verdict = 'probable'
  else if (pct >= 15) verdict = 'possible'
  else verdict = 'unlikely'

  const reasoning = [
    ...waterIndicators.map(i => `+ ${i}.`),
    ...dryIndicators.map(i => `- ${i}.`),
  ].join(' ')

  return {
    confidence: pct,
    verdict,
    reasoning,
    contributingFactors: [...waterIndicators, ...dryIndicators],
    anomalies: ['AI tidak tersedia, menggunakan analisis otomatis', ...anomalies],
    recommendations: pct >= 40
      ? ['Verifikasi lapangan untuk konfirmasi keberadaan air.', 'Pantau perubahan secara berkala.']
      : ['Data satelit tidak menunjukkan indikasi air signifikan.', 'Coba observasi ulang setelah hujan.'],
  }
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

    let geminiResult: GeminiAnalysisResult
    try {
      geminiResult = await analyzeSatelliteData(satelliteData)
    } catch (err) {
      logger.error('AI analysis failed', { observationId, error: String(err) })
      geminiResult = ruleBasedAnalysis(satelliteData)
    }

    await GeminiAnalysis.create({
      observationId,
      ...geminiResult,
      processedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    })

    const province = latLngToProvince(obs.latitude, obs.longitude)
    if (province) {
      await Observation.updateOne({ _id: observationId }, { $set: { province, status: 'completed' } })

      const completedInProvince = await GeminiAnalysis.aggregate([
        { $lookup: { from: 'observations', localField: 'observationId', foreignField: '_id', as: 'obs' } },
        { $unwind: '$obs' },
        { $match: { 'obs.province': province, 'obs.status': 'completed' } },
        { $group: { _id: null, avgConfidence: { $avg: '$confidence' }, count: { $sum: 1 } } },
      ])

      const avg = completedInProvince[0]?.avgConfidence ?? geminiResult.confidence
      const count = completedInProvince[0]?.count ?? 1

      await RegionalIndex.updateOne(
        { province },
        {
          $set: {
            waterIndex: Math.round(avg),
            waterPercentage: Math.round(avg * 0.8),
            observationCount: count,
            lastUpdated: new Date(),
          },
          $push: {
            historicalTrend: {
              $each: [{ date: new Date(), waterIndex: Math.round(avg) }],
              $slice: -30,
            },
          },
        },
        { upsert: true }
      )
    } else {
      await Observation.updateOne({ _id: observationId }, { $set: { status: 'completed' } })
    }
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
