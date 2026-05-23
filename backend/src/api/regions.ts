import { Elysia } from 'elysia'
import { getRegionSummary } from '../services/region'

export const regionRouter = new Elysia({ prefix: '/api' })
  .get('/regions', async () => getRegionSummary())
