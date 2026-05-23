import { Elysia, t } from 'elysia'
import {
  createObservation,
  getObservationDetail,
  getAnalysisResult,
  ValidationError,
} from '../services/observation'
import { processObservation } from '../services/pipeline'
import { NotFoundError, BadRequestError } from '../middleware/error'

export const observationRouter = new Elysia({ prefix: '/api' })
  .post('/observations', async ({ body, set }) => {
    const { latitude, longitude, photo } = body as {
      latitude: string
      longitude: string
      photo?: File
    }

    if (!latitude || !longitude) {
      throw new BadRequestError('Missing latitude or longitude')
    }

    try {
      const observation = await createObservation(latitude, longitude, photo)

      processObservation(observation._id.toString()).catch((err) =>
        console.error(`Background pipeline error:`, err)
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
      photo: t.Optional(t.File()),
    }),
  })

  .get('/observations/:id', async ({ params }) => {
    const result = await getObservationDetail(params.id)
    if (!result) throw new NotFoundError('Observation not found')
    return result
  })

  .get('/observations/:id/analysis', async ({ params }) => {
    const result = await getAnalysisResult(params.id)
    if (!result) throw new NotFoundError('Observation not found')
    return result
  })
