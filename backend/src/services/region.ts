import { Observation } from '../models/Observation'

export async function getRegionSummary() {
  const results = await Observation.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'geminianalyses',
        localField: '_id',
        foreignField: 'observationId',
        as: 'analysis',
      },
    },
    { $unwind: { path: '$analysis', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$province',
        avgConfidence: { $avg: '$analysis.confidence' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        province: '$_id',
        avgConfidence: { $round: ['$avgConfidence', 0] },
        count: 1,
        _id: 0,
      },
    },
  ])

  return { regions: results }
}
