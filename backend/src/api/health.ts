import { Elysia } from 'elysia'
import mongoose from 'mongoose'

export const healthRouter = new Elysia({ prefix: '/api/v1' })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  }))
