import { Elysia } from 'elysia'
import { getGlobalStats } from '../services/stats'

export const statsRouter = new Elysia({ prefix: '/api/v1' })
  .get('/stats', async () => getGlobalStats())
