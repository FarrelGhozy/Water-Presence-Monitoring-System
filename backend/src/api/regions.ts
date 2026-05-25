import { Elysia } from 'elysia'
import { getRegionSummary, getRegionStats, getRegionTrends } from '../services/region'
import { NotFoundError } from '../middleware/error'

export const regionRouter = new Elysia({ prefix: '/api/v1' })
  .get('/regions', async () => getRegionSummary())

  .get('/regions/:province/stats', async ({ params }) => {
    const result = await getRegionStats(params.province)
    if (!result) throw new NotFoundError('Region not found')
    return result
  })

  .get('/regions/:province/trends', async ({ params }) => {
    const result = await getRegionTrends(params.province)
    if (!result) throw new NotFoundError('Region not found')
    return result
  })
