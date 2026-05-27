import { logger } from '../utils/logger'

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ExternalApiError extends Error {
  constructor(message: string, public service: string) {
    super(message)
    this.name = 'ExternalApiError'
  }
}

const statusMap: Record<string, number> = {
  BadRequestError: 400,
  ValidationError: 400,
  NotFoundError: 404,
  ExternalApiError: 502,
}

export function handleError(error: unknown, set: { status?: number | string }) {
  const name = error instanceof Error ? error.name : ''

  const ownStatus =
    error instanceof Error && 'status' in error
      ? (error as Error & { status: number }).status
      : undefined

  set.status = ownStatus ?? statusMap[name] ?? 500

  if (set.status === 500) {
    logger.error('Unhandled error', { error: String(error) })
  }

  return { error: error instanceof Error ? error.message : 'Internal server error' }
}
