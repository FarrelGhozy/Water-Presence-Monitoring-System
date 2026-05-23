import { Elysia } from 'elysia'

export const healthRouter = new Elysia({ prefix: '/api' })
  .get('/health', () => ({ status: 'ok' }))
