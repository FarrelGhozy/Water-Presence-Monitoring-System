import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import mongoose from 'mongoose'
import { config, validateConfig } from './config'
import { observationRouter, regionRouter, healthRouter, mapRouter, statsRouter } from './api'
import { handleError } from './middleware/error'
import { logger } from './utils/logger'

validateConfig()

const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173']

export const app = new Elysia()
  .use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  }))
  .onError(({ error, set }) => handleError(error, set))
  .use(observationRouter)
  .use(regionRouter)
  .use(healthRouter)
  .use(mapRouter)
  .use(statsRouter)

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(config.mongoUri)
    .then(() => {
      logger.info('MongoDB connected', { uri: config.mongoUri })
      app.listen(config.port)
      logger.info('Server started', { port: config.port })
    })
    .catch((err) => {
      logger.error('MongoDB connection error', { error: String(err) })
      process.exit(1)
    })
}
