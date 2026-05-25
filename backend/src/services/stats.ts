import { Observation } from '../models/Observation'
import { RegionalIndex } from '../models/RegionalIndex'

export async function getGlobalStats() {
  const [totalObservations, byStatus, regionCount] = await Promise.all([
    Observation.countDocuments(),
    Observation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    RegionalIndex.countDocuments(),
  ])

  const statusBreakdown: Record<string, number> = {}
  for (const s of byStatus) {
    statusBreakdown[s._id] = s.count
  }

  return {
    totalObservations,
    statusBreakdown,
    regionsMonitored: regionCount,
  }
}
