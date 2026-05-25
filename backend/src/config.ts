export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/water-monitor-dev',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geeWorkerUrl: process.env.GEE_WORKER_URL || 'http://localhost:8000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  redisUrl: process.env.REDIS_URL || '',
  storagePath: process.env.STORAGE_PATH || './uploads',
} as const

export function validateConfig(): void {
  const missing: string[] = []
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY')
  if (missing.length) {
    console.warn(`Missing env vars: ${missing.join(', ')}`)
  }
}
