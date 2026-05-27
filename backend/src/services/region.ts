import { Observation } from '../models/Observation'
import { RegionalIndex } from '../models/RegionalIndex'

export async function getRegionSummary() {
  const results = await RegionalIndex.find()
    .sort({ observationCount: -1 })
    .lean()

  if (results.length === 0) return { regions: [] }

  return {
    regions: results.map(r => ({
      province: r.province,
      waterIndex: r.waterIndex,
      waterPercentage: r.waterPercentage,
      observationCount: r.observationCount,
      lastUpdated: r.lastUpdated,
    })),
  }
}

export async function getRegionStats(province: string) {
  const region = await RegionalIndex.findOne({ province }).lean()
  if (!region) return null

  const recentObservations = await Observation.find({ province, status: 'completed' })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean()

  return {
    province: region.province,
    waterIndex: region.waterIndex,
    waterPercentage: region.waterPercentage,
    observationCount: region.observationCount,
    lastUpdated: region.lastUpdated,
    recentObservations: recentObservations.map(o => ({
      _id: o._id,
      latitude: o.latitude,
      longitude: o.longitude,
      timestamp: o.timestamp,
      confidence: null,
    })),
  }
}

export async function getRegionTrends(province: string) {
  const region = await RegionalIndex.findOne({ province }).lean()
  if (!region) return null

  return {
    province: region.province,
    currentIndex: region.waterIndex,
    trend: region.historicalTrend?.map(t => ({
      date: t.date,
      waterIndex: t.waterIndex,
    })) || [],
  }
}
