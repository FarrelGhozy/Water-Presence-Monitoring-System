import { RegionalIndex } from '../models/RegionalIndex'
import { Observation } from '../models/Observation'

export async function getIndonesiaChoropleth() {
  const regions = await RegionalIndex.find().sort({ province: 1 }).lean()

  const features = await Promise.all(regions.map(async (r) => {
    const obs = await Observation.findOne({ province: r.province })
      .sort({ timestamp: -1 })
      .lean()

    return {
      type: 'Feature' as const,
      properties: {
        province: r.province,
        waterIndex: r.waterIndex,
        waterPercentage: r.waterPercentage,
        observationCount: r.observationCount,
        color: getColorForIndex(r.waterIndex),
      },
      geometry: obs
        ? {
            type: 'Point' as const,
            coordinates: [obs.longitude, obs.latitude],
          }
        : undefined,
    }
  }))

  return {
    type: 'FeatureCollection' as const,
    features,
  }
}

function getColorForIndex(index: number): string {
  if (index >= 75) return '#22c55e'
  if (index >= 50) return '#eab308'
  if (index >= 25) return '#f97316'
  return '#ef4444'
}
