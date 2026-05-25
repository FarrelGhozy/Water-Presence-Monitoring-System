import { Elysia } from 'elysia'
import { getIndonesiaChoropleth } from '../services/map'

export const mapRouter = new Elysia({ prefix: '/api/v1' })
  .get('/map/indonesia', async () => getIndonesiaChoropleth())
