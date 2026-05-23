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

  if (isNaN(lat) || isNaN(lng)) {
    throw new ValidationError('Invalid latitude or longitude')
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

export async function getObservationDetail(id: string) {
  const obs = await Observation.findById(id)
  if (!obs) return null

  const [satellite, analysis] = await Promise.all([
    SatelliteData.findOne({ observationId: id }),
    GeminiAnalysis.findOne({ observationId: id }),
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
  const obs = await Observation.findById(id)
  if (!obs) return null

  if (obs.status === 'processing' || obs.status === 'pending') {
    return { status: 'processing' as const }
  }

  if (obs.status === 'error') {
    return { status: 'error' as const, message: 'Analysis failed' }
  }

  const [satellite, analysis] = await Promise.all([
    SatelliteData.findOne({ observationId: id }),
    GeminiAnalysis.findOne({ observationId: id }),
  ])

  return {
    status: 'completed' as const,
    confidence: analysis?.confidence ?? null,
    verdict: analysis?.verdict ?? null,
    reasoning: analysis?.reasoning ?? null,
    recommendations: analysis?.recommendations ?? [],
    satellite,
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
