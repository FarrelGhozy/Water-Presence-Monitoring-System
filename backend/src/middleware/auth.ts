import { config } from '../config'

export function requireAuth({ request, set }: { request: { headers: { get: (name: string) => string | null } }; set: { status?: number | string } }) {
  if (!config.apiKey) return

  const key = request.headers.get('x-api-key')
  if (key !== config.apiKey) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
}
