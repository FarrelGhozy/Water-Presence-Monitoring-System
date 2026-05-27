import { Observation } from '../models/Observation'
import { SatelliteData } from '../models/SatelliteData'
import { GeminiAnalysis } from '../models/GeminiAnalysis'
import { savePhoto } from '../utils/storage'
import type { ObservationStatus } from '../types'

const PHOTO_MAX_BYTES = 5_000_000

export async function createObservation(
  latitude: string,
  longitude: string,
  photo?: File
) {
  const lat = parseFloat(latitude)
  const lng = parseFloat(longitude)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ValidationError('Invalid latitude or longitude. Lat must be -90..90, Lng must be -180..180')
  }

  let photoUrl: string | null = null

  if (photo) {
    const buffer = Buffer.from(await photo.arrayBuffer())
    if (buffer.length > PHOTO_MAX_BYTES) {
      throw new ValidationError('Photo must be < 5MB')
    }
    photoUrl = await savePhoto(buffer)
  }

  return Observation.create({
    latitude: lat,
    longitude: lng,
    photoUrl,
    status: 'pending',
  })
}

export async function listObservations(options: {
  status?: string
  province?: string
  limit?: number
  offset?: number
  bbox?: string
}) {
  const filter: Record<string, unknown> = {}
  if (options.status) filter.status = options.status
  if (options.province) filter.province = options.province
  if (options.bbox) {
    const [s, w, n, e] = options.bbox.split(',').map(Number)
    if (!isNaN(s) && !isNaN(w) && !isNaN(n) && !isNaN(e)) {
      filter.latitude = { $gte: s, $lte: n }
      filter.longitude = { $gte: w, $lte: e }
    }
  }

  const [observations, total] = await Promise.all([
    Observation.find(filter)
      .sort({ timestamp: -1 })
      .skip(options.offset || 0)
      .limit(options.limit || 20)
      .lean(),
    Observation.countDocuments(filter),
  ])

  return { observations, total, limit: options.limit || 20, offset: options.offset || 0 }
}

export async function getObservationDetail(id: string) {
  const obs = await Observation.findById(id).lean()
  if (!obs) return null

  const [satellite, analysis] = await Promise.all([
    SatelliteData.findOne({ observationId: id }).lean(),
    GeminiAnalysis.findOne({ observationId: id }).lean(),
  ])

  return {
    observation: {
      _id: obs._id,
      latitude: obs.latitude,
      longitude: obs.longitude,
      province: obs.province,
      photoUrl: obs.photoUrl,
      timestamp: obs.timestamp,
      status: obs.status,
    },
    satellite_data: satellite ?? null,
    analysis: analysis ?? null,
  }
}

export async function getAnalysisResult(id: string) {
  const obs = await Observation.findById(id).lean()
  if (!obs) return null

  if (obs.status === 'processing' || obs.status === 'pending') {
    return { status: 'processing' as const }
  }

  if (obs.status === 'error') {
    return { status: 'error' as const, message: 'Analysis failed' }
  }

  const [satellite, analysis] = await Promise.all([
    SatelliteData.findOne({ observationId: id }).lean(),
    GeminiAnalysis.findOne({ observationId: id }).lean(),
  ])

  return {
    status: 'completed' as const,
    confidence: analysis?.confidence ?? null,
    verdict: analysis?.verdict ?? null,
    reasoning: analysis?.reasoning ?? null,
    contributingFactors: analysis?.contributingFactors ?? [],
    anomalies: analysis?.anomalies ?? [],
    recommendations: analysis?.recommendations ?? [],
    satellite,
  }
}

export async function getSatelliteData(id: string) {
  const obs = await Observation.findById(id).lean()
  if (!obs) return null

  const satellite = await SatelliteData.findOne({ observationId: id }).lean()
  if (!satellite) return null

  return {
    observationId: id,
    sar: satellite.sar,
    ndwi: satellite.ndwi,
    chirps: satellite.chirps,
    soil: satellite.soil,
    elevation: satellite.elevation,
  }
}

export async function deleteObservation(id: string) {
  const obs = await Observation.findById(id)
  if (!obs) return false

  await Promise.all([
    Observation.deleteOne({ _id: id }),
    SatelliteData.deleteOne({ observationId: id }),
    GeminiAnalysis.deleteOne({ observationId: id }),
  ])

  return true
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
