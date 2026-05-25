import { RegionalIndex } from '../models/RegionalIndex'

export async function getIndonesiaChoropleth() {
  const regions = await RegionalIndex.find().sort({ province: 1 }).lean()

  const features = regions.map(r => ({
    type: 'Feature' as const,
    properties: {
      province: r.province,
      waterIndex: r.waterIndex,
      waterPercentage: r.waterPercentage,
      observationCount: r.observationCount,
      color: getColorForIndex(r.waterIndex),
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [0, 0],
    },
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
