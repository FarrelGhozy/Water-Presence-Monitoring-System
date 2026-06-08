import { Elysia, t } from 'elysia'
import {
  createObservation,
  getObservationDetail,
  getAnalysisResult,
  getSatelliteData,
  listObservations,
  deleteObservation,
  ValidationError,
} from '../services/observation'
import { processObservation } from '../services/pipeline'
import { NotFoundError, BadRequestError } from '../middleware/error'
import { requireAuth } from '../middleware/auth'
import { logger } from '../utils/logger'

export const observationRouter = new Elysia({ prefix: '/api/v1' })
  .post('/observations', async ({ request, body, set }) => {
    const authError = requireAuth({ request, set })
    if (authError) return authError

    const { latitude, longitude } = body as {
      latitude: string
      longitude: string
    }

    if (!latitude || !longitude) {
      throw new BadRequestError('Missing latitude or longitude')
    }

    try {
      const observation = await createObservation(latitude, longitude)

      processObservation(observation._id.toString()).catch((err) =>
        logger.error('Background pipeline error', { observationId: observation._id.toString(), error: String(err) })
      )

      set.status = 201
      return {
        observation_id: observation._id,
        status: 'accepted',
        message: 'Observation queued for analysis',
      }
    } catch (err) {
      if (err instanceof ValidationError) throw new BadRequestError(err.message)
      throw err
    }
  }, {
    body: t.Object({
      latitude: t.String(),
      longitude: t.String(),
    }),
  })

  .get('/observations', async ({ query }) => {
    const { status, province, limit, offset, bbox } = query as {
      status?: string
      province?: string
      limit?: string
      offset?: string
      bbox?: string
    }
    return listObservations({
      status,
      province,
      bbox,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    })
  })

  .get('/observations/:id', async ({ params }) => {
    const result = await getObservationDetail(params.id)
    if (!result) throw new NotFoundError('Observation not found')
    return result
  })

  .delete('/observations/:id', async ({ request, params, set }) => {
    const authError = requireAuth({ request, set })
    if (authError) return authError

    const deleted = await deleteObservation(params.id)
    if (!deleted) throw new NotFoundError('Observation not found')
    return { message: 'Observation deleted' }
  })

  .get('/observations/:id/analysis', async ({ params }) => {
    const result = await getAnalysisResult(params.id)
    if (!result) throw new NotFoundError('Observation not found')
    return result
  })

  .get('/observations/:id/satellite-data', async ({ params }) => {
    const result = await getSatelliteData(params.id)
    if (!result) throw new NotFoundError('Observation or satellite data not found')
    return result
  })
