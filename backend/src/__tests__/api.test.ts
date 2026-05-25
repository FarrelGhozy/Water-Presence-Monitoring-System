import { mock, test, expect, describe, beforeAll } from 'bun:test'

function mockQuery() {
  const q = {
    sort: mock(() => q),
    skip: mock(() => q),
    limit: mock(() => q),
    lean: mock(() => q),
  }
  return q
}

function queryResult(data: unknown) {
  return {
    lean: mock(() => Promise.resolve(data)),
    then: (resolve: (v: unknown) => unknown) => resolve(data),
  }
}

function mockModel(overrides: Record<string, unknown> = {}) {
  const q = mockQuery()
  return {
    create: mock(() => Promise.resolve({ _id: 'abc123', toString: () => 'abc123' })),
    findById: mock(() => queryResult(null)),
    findOne: mock(() => queryResult(null)),
    find: mock(() => q),
    countDocuments: mock(() => Promise.resolve(0)),
    deleteOne: mock(() => Promise.resolve({ deletedCount: 1 })),
    updateOne: mock(() => Promise.resolve({ modifiedCount: 1 })),
    aggregate: mock(() => Promise.resolve([])),
    ...overrides,
  }
}

const observationModel = mockModel()
const satelliteModel = mockModel()
const geminiModel = mockModel()
const regionalModel = mockModel()

mock.module('mongoose', () => {
  class MockSchema {
    constructor(_schema: Record<string, unknown>) {}
    index() { return this }
    pre() { return this }
    static Types = { ObjectId: 'ObjectId' }
    static Schema = MockSchema
  }

  let callCount = 0
  const instances: Record<string, ReturnType<typeof mockModel>> = {}

  function getOrCreateModel(name: string) {
    if (!instances[name]) {
      const m = callCount++
      switch (name) {
        case 'Observation': instances[name] = observationModel; break
        case 'SatelliteData': instances[name] = satelliteModel; break
        case 'GeminiAnalysis': instances[name] = geminiModel; break
        case 'RegionalIndex': instances[name] = regionalModel; break
        default: instances[name] = mockModel()
      }
      instances[name].modelName = name
    }
    return instances[name]
  }

  return {
    default: {
      connect: mock(() => Promise.resolve()),
      connection: { readyState: 1, on: mock(), once: mock() },
      Schema: MockSchema,
      Types: { ObjectId: 'ObjectId' },
      model: mock((name: string) => getOrCreateModel(name)),
    },
    Schema: MockSchema,
    Types: { ObjectId: 'ObjectId' },
    model: mock((name: string) => getOrCreateModel(name)),
    connect: mock(() => Promise.resolve()),
    connection: { readyState: 1, on: mock(), once: mock() },
  }
})

process.env.NODE_ENV = 'test'
process.env.PORT = '0'

let app: Awaited<ReturnType<typeof import('../index').then>> extends { app: infer A } ? A : never
let handle: (req: Request) => Promise<Response>

beforeAll(async () => {
  const mod = await import('../index')
  app = mod.app
  handle = (req: Request) => app.handle(req)
})

describe('Health', () => {
  test('GET /api/v1/health returns 200', async () => {
    const res = await handle(new Request('http://localhost/api/v1/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.uptime).toBeGreaterThan(0)
  })
})

describe('Observations', () => {
  test('POST /api/v1/observations returns 201', async () => {
    const form = new FormData()
    form.append('latitude', '-7.25')
    form.append('longitude', '112.75')

    const res = await handle(new Request('http://localhost/api/v1/observations', {
      method: 'POST',
      body: form,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.observation_id).toBe('abc123')
    expect(body.status).toBe('accepted')
  })

  test('POST /api/v1/observations missing lat/lng returns 422', async () => {
    const form = new FormData()
    const res = await handle(new Request('http://localhost/api/v1/observations', {
      method: 'POST',
      body: form,
    }))
    expect(res.status).toBe(422)
  })

  test('POST /api/v1/observations invalid lat/lng returns 400', async () => {
    const form = new FormData()
    form.append('latitude', 'not-a-number')
    form.append('longitude', '112.75')
    const res = await handle(new Request('http://localhost/api/v1/observations', {
      method: 'POST',
      body: form,
    }))
    expect(res.status).toBe(400)
  })

  test('GET /api/v1/observations returns 200', async () => {
    const res = await handle(new Request('http://localhost/api/v1/observations'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.observations).toBeDefined()
    expect(body.total).toBeDefined()
  })

  test('GET /api/v1/observations with filters returns 200', async () => {
    const res = await handle(new Request('http://localhost/api/v1/observations?status=completed&limit=5'))
    expect(res.status).toBe(200)
  })

  test('GET /api/v1/observations/:id returns 404 for nonexistent', async () => {
    const res = await handle(new Request('http://localhost/api/v1/observations/nonexistent'))
    expect(res.status).toBe(404)
  })

  test('GET /api/v1/observations/:id returns 200 when found', async () => {
    observationModel.findById = mock(() => queryResult({
      _id: 'obs123',
      latitude: -7.25,
      longitude: 112.75,
      province: 'Jawa Timur',
      status: 'completed',
      timestamp: new Date(),
    }))
    satelliteModel.findOne = mock(() => queryResult({
      sar: { waterPercentage: 34, backscatterMean: -18.5, confidence: 'high' },
      ndwi: { value: 0.42, available: true, cloudCover: 15 },
    }))
    geminiModel.findOne = mock(() => queryResult({
      confidence: 78,
      verdict: 'probable',
      reasoning: 'SAR shows water coverage',
      recommendations: ['Verify on site'],
    }))

    const res = await handle(new Request('http://localhost/api/v1/observations/obs123'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.observation).toBeDefined()
    expect(body.observation._id).toBe('obs123')
    expect(body.analysis).toBeDefined()
    expect(body.analysis.confidence).toBe(78)
  })

  test('GET /api/v1/observations/:id/analysis returns processing status', async () => {
    observationModel.findById = mock(() => queryResult({ _id: 'obs456', status: 'processing' }))

    const res = await handle(new Request('http://localhost/api/v1/observations/obs456/analysis'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('processing')
  })

  test('DELETE /api/v1/observations/:id returns 200', async () => {
    observationModel.findById = mock(() => queryResult({ _id: 'obs789', toString: () => 'obs789' }))

    const res = await handle(new Request('http://localhost/api/v1/observations/obs789', {
      method: 'DELETE',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Observation deleted')
  })

  test('DELETE /api/v1/observations/:id returns 404 for nonexistent', async () => {
    observationModel.findById = mock(() => Promise.resolve(null))

    const res = await handle(new Request('http://localhost/api/v1/observations/nonexistent', {
      method: 'DELETE',
    }))
    expect(res.status).toBe(404)
  })
})

describe('Regions', () => {
  test('GET /api/v1/regions returns 200', async () => {
    regionalModel.find = mock(() => ({
      sort: mock(() => ({
        lean: mock(() => Promise.resolve([
          { province: 'Jawa Timur', waterIndex: 65, waterPercentage: 40, observationCount: 10, lastUpdated: new Date() },
        ])),
      })),
    }))

    const res = await handle(new Request('http://localhost/api/v1/regions'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.regions).toBeDefined()
  })

  test('GET /api/v1/regions/:province/stats returns 200', async () => {
    regionalModel.findOne = mock(() => queryResult({
      province: 'Jawa Timur', waterIndex: 65, waterPercentage: 40,
      observationCount: 10, lastUpdated: new Date(),
    }))
    observationModel.find = mock(() => ({
      sort: mock(() => ({
        limit: mock(() => ({
          lean: mock(() => Promise.resolve([])),
        })),
      })),
    }))

    const res = await handle(new Request('http://localhost/api/v1/regions/Jawa%20Timur/stats'))
    expect(res.status).toBe(200)
  })

  test('GET /api/v1/regions/:province/trends returns 200', async () => {
    const res = await handle(new Request('http://localhost/api/v1/regions/Jawa%20Timur/trends'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentIndex).toBeDefined()
  })
})

describe('Map', () => {
  test('GET /api/v1/map/indonesia returns FeatureCollection', async () => {
    regionalModel.find = mock(() => ({
      sort: mock(() => ({
        lean: mock(() => Promise.resolve([
          { province: 'Jawa Timur', waterIndex: 65, waterPercentage: 40, observationCount: 10 },
        ])),
      })),
    }))

    const res = await handle(new Request('http://localhost/api/v1/map/indonesia'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('FeatureCollection')
    expect(body.features).toBeDefined()
  })
})

describe('Stats', () => {
  test('GET /api/v1/stats returns 200', async () => {
    observationModel.countDocuments = mock(() => Promise.resolve(42))
    observationModel.aggregate = mock(() => Promise.resolve([
      { _id: 'completed', count: 30 },
      { _id: 'pending', count: 12 },
    ]))
    regionalModel.countDocuments = mock(() => Promise.resolve(5))

    const res = await handle(new Request('http://localhost/api/v1/stats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalObservations).toBe(42)
    expect(body.regionsMonitored).toBe(5)
    expect(body.statusBreakdown.completed).toBe(30)
  })
})
