export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/water-monitor-dev',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'openrouter/owl-alpha',
  geeWorkerUrl: process.env.GEE_WORKER_URL || 'http://localhost:8000',
  storagePath: process.env.STORAGE_PATH || './uploads',
} as const

export function validateConfig(): void {
  const missing: string[] = []
  if (!config.openrouterApiKey) missing.push('OPENROUTER_API_KEY')
  if (missing.length > 0) {
    console.warn(`Missing env vars: ${missing.join(', ')}`)
  }
}
