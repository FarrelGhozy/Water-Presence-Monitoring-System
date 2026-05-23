import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import mongoose from 'mongoose'
import { config, validateConfig } from './config'
import { observationRouter, regionRouter, healthRouter } from './api'
import { handleError } from './middleware/error'

validateConfig()

const app = new Elysia()
  .use(cors())
  .onError(({ error, set }) => handleError(error, set))
  .use(observationRouter)
  .use(regionRouter)
  .use(healthRouter)
  .listen(config.port)

mongoose
  .connect(config.mongoUri)
  .then(() => console.log(`MongoDB connected: ${config.mongoUri}`))
  .catch((err) => console.error('MongoDB connection error:', err))

console.log(`Server running on http://localhost:${config.port}`)
