# WATER PRESENCE MONITORING SYSTEM
## Implementation Guide & Technical Details

---

## TABLE OF CONTENTS

1. [Development Setup](#1-development-setup)
2. [API Integration Details](#2-api-integration-details)
3. [Data Processing Pipeline](#3-data-processing-pipeline)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Key Decision Rationales](#6-key-decision-rationales)
7. [Risk Mitigation Strategies](#7-risk-mitigation-strategies)

---

## 1. DEVELOPMENT SETUP

### 1.1 Local Environment

**Prerequisites:**
```
- Bun 1.0+
- Node.js 18+ (for Python interop)
- Docker (for local databases)
- Git
- VS Code (recommended) + Continue.dev (your AI setup)
```

**Initial Setup:**
```bash
# Clone repo
git clone https://github.com/yourusername/water-presence.git
cd water-presence

# Install dependencies
bun install

# Copy env template
cp .env.example .env
cp .env.example .env.local

# Start local database stack
docker-compose -f docker-compose.dev.yml up -d
```

**Environment Variables (Development):**
```env
# Frontend
VITE_API_BASE=http://localhost:3000/api
VITE_MAP_TILES=https://tile.openstreetmap.org

# Backend
BUN_ENV=development
DATABASE_URL=mongodb://localhost:27017/water-monitor-dev
POSTGRES_URL=postgresql://user:pass@localhost:5432/water-monitor
REDIS_URL=redis://localhost:6379

# APIs
GEMINI_API_KEY=<get from Google Cloud console>
GEE_SERVICE_ACCOUNT=<JSON from Google Earth Engine>
BMKG_API_KEY=<optional, try without first>

# Auth
JWT_SECRET=dev-secret-change-in-prod
JWT_EXPIRY=24h

# File Storage (dev: local filesystem)
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

**Database Initialization:**
```bash
# MongoDB migrations (seed data)
bun run scripts/seed-mongodb.ts

# PostgreSQL migrations
bun run scripts/migrate-postgres.ts

# Create Redis indices
bun run scripts/init-redis.ts
```

### 1.2 Project Structure

```
water-presence/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client, utils
│   │   ├── store/              # Zustand state
│   │   ├── types/              # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Bun + ElysiaJS
│   ├── src/
│   │   ├── api/                # Route handlers
│   │   ├── services/           # Business logic
│   │   ├── models/             # DB models
│   │   ├── middleware/         # Middleware
│   │   ├── utils/              # Utilities
│   │   ├── workers/            # Bull job processors
│   │   ├── external/           # External API clients
│   │   └── index.ts            # Server entry
│   ├── docker/Dockerfile       # Backend Docker image
│   └── package.json
│
├── python-worker/              # Python async processing
│   ├── services/
│   │   ├── gee.py             # Earth Engine queries
│   │   ├── analysis.py        # Analysis logic
│   │   └── weather.py         # Weather API calls
│   ├── app.py                 # FastAPI server
│   ├── requirements.txt
│   └── docker/Dockerfile
│
├── docker-compose.dev.yml      # Local dev stack
├── docker-compose.prod.yml     # Production stack
└── README.md
```

---

## 2. API INTEGRATION DETAILS

### 2.1 Gemini Vision Integration

**Purpose:** Analyze smartphone photos for visual water presence, soil type, surface condition.

**Integration Point:** Backend receives photo (base64 or URL), calls Gemini, stores result.

**API Details:**
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Authentication:** API Key (in Authorization header)
- **Rate Limit:** 50,000 req/month free tier (plenty for hackathon)
- **Latency:** 2-5 seconds typical
- **Cost:** ~$0.0008 per image

**Request Payload Example:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are an environmental analyst. Analyze this water location photo. Respond ONLY as JSON with these fields: soilType, waterPresence ('high'|'medium'|'low'|'none'), confidence (0-100), surface_condition, vegetation, anomalies (array), recommendation"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "<base64-encoded-image>"
          }
        }
      ]
    }
  ]
}
```

**Response Parsing:**
- Gemini returns markdown by default, we need JSON
- Add to prompt: "Respond ONLY in valid JSON, no markdown"
- Parse response, extract JSON block if wrapped
- Handle failures: timeouts, rate limits, malformed responses

**Implementation Strategy:**
```
1. Receive photo from frontend
2. Validate: size < 5MB, format JPEG/PNG
3. Compress if needed (client should pre-compress)
4. Convert to base64
5. Call Gemini with prompt + image
6. Parse JSON response
7. Validate required fields present
8. Store in MongoDB analysis_results.gemini_result
9. Return to caller
```

**Fallback/Error Handling:**
- Timeout after 30 seconds → queue for retry
- Rate limit → exponential backoff (1s → 2s → 4s → fail)
- Malformed response → mark as "failed", show user error
- Network error → retry up to 2 times, then fail gracefully

---

### 2.2 Google Earth Engine API Integration

**Purpose:** Calculate NDWI (water index) from Sentinel-2 satellite imagery.

**Challenge:** GEE is complex. Two options:

**Option A: JavaScript API (Recommended for hackathon)**
- Access via `https://earthengine.google.com/api`
- Use `ee.initialize()` in Python or Node.js server
- Run computations server-side, export results

**Option B: REST API (Easier, but limited)**
- Simpler HTTP requests
- Less powerful filtering/processing
- Use for simple queries only

**Recommended: Hybrid Approach**
- Use REST API for simple NDWI calculations
- Fall back to JavaScript API if REST insufficient

**REST API Endpoint:**
```
POST https://earthengine.googleapis.com/v1alpha/projects/earthengine-public/processingRequest/launch
```

**Request Body (simplified):**
```json
{
  "expression": "var img = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(ee.Geometry.Point([lng, lat])).filterDate(start_date, end_date).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).mosaic(); var ndwi = img.normalizedDifference(['B3', 'B8']); return ndwi;",
  "outputType": "FLOAT"
}
```

**Better: Use Python Worker with Earth Engine Python API**

```python
# In Python worker
import ee

def calculate_ndwi(lat: float, lng: float, days_back: int = 3):
    """Calculate NDWI for location"""
    ee.Authenticate()
    ee.Initialize()
    
    point = ee.Geometry.Point([lng, lat])
    
    # Get Sentinel-2 imagery
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(point)
        .filterDate(
            ee.Date.now().advance(-days_back, 'day'),
            ee.Date.now()
        )
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    )
    
    if collection.size().getInfo() == 0:
        return None  # No suitable images
    
    # Mosaic and calculate NDWI
    mosaic = collection.mosaic()
    ndwi = mosaic.normalizedDifference(['B3', 'B8'])
    
    # Sample at point
    sample = ndwi.sample(point, 30).first()  # 30m resolution
    ndwi_value = sample.get('nd').getInfo()
    
    # Calculate cloud cover
    cloud_cover = (
        collection.first()
        .get('CLOUDY_PIXEL_PERCENTAGE')
        .getInfo()
    )
    
    image_date = (
        collection.first()
        .get('system:time_start')
        .getInfo()
    )
    
    return {
        'ndwi_value': ndwi_value,
        'cloud_cover': cloud_cover,
        'image_date': image_date,
        'has_water': ndwi_value > 0.3  # NDWI > 0.3 = water
    }
```

**Integration:**
1. Backend receives observation request
2. Queues job: `fetch_satellite_data` with {lat, lng, days_back}
3. Python worker processes
4. Returns result to backend
5. Backend stores in MongoDB

**Caching Strategy:**
- Cache result for 7 days (satellite data doesn't change)
- Key: `sat:{lat}:{lng}`
- Before querying GEE, check Redis
- If cached, use cached result
- If miss, query GEE, cache result

---

### 2.3 BMKG Weather API Integration

**Purpose:** Get weather data (temp, humidity, rainfall) at observation location.

**Reality:** BMKG API is poorly documented and unreliable.

**Approach:**
```
1. Try BMKG API first (best data for Indonesia)
2. If BMKG timeout > 5 sec, skip to fallback
3. Fallback to OpenWeather API (costs $$$ but reliable)
4. If both fail, continue without weather data
```

**BMKG API (Indonesian Meteorological Service):**
- **URL:** `https://data.bmkg.go.id/DataMKG/MEWS/LatestStagePrecipitation/`
- **Format:** GeoJSON with precipitation data
- **Problem:** Limited, inconsistent, slow
- **No authentication needed**

**Integration:**
```
1. Get nearest BMKG station to (lat, lng)
2. Query precipitation for last 24h
3. If no data, return null
4. Cache for 1 hour
```

**Fallback: OpenWeather API**
- **URL:** `https://api.openweathermap.org/data/2.5/weather`
- **Cost:** $0.01-0.05 per call (need API key)
- **Authentication:** API key in query string
- **Rate Limit:** 60 calls/minute free tier

**Decision for MVP:**
- Implement BMKG only (no cost)
- Skip if unavailable (weather is nice-to-have)
- Document as limitation: "Weather data unavailable, analysis based on satellite + photo"

**Implementation:**
```python
# Python worker
import httpx

async def get_weather(lat: float, lng: float):
    """Fetch weather from BMKG, skip if timeout"""
    try:
        # Try BMKG with 5 sec timeout
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                'https://data.bmkg.go.id/DataMKG/MEWS/LatestStagePrecipitation/',
                params={'lat': lat, 'lon': lng}
            )
            data = resp.json()
            
            if data and 'features' in data and len(data['features']) > 0:
                feature = data['features'][0]
                return {
                    'rainfall_24h': feature['properties']['RH'],
                    'source': 'bmkg'
                }
    except Exception as e:
        logger.warning(f"BMKG fetch failed: {e}")
    
    return None  # Skip weather if BMKG fails
```

---

### 2.4 BIG API (Indonesian Geospatial Agency)

**Purpose:** Get soil type, elevation, land cover classification.

**Status:** Rarely needed for MVP. Nice-to-have, skip if complex.

**For MVP:** Use free OpenDEM instead
- **URL:** `https://www.opendem.info/`
- **Format:** GeoTIFF (elevation data)
- **No auth required for basic queries**

**Decision:** Skip BIG for MVP. Add elevation only if time allows.

---

## 3. DATA PROCESSING PIPELINE

### 3.1 Job Queue Architecture (Bull)

**Why Bull?**
- Redis-backed task queue
- Built-in retry logic
- Priority support
- Scheduled jobs (hourly aggregation)
- Simple integration with Bun

**Queue Definitions:**

```typescript
// backend/src/queues/index.ts

import Bull from 'bull';

export const analyzePhotoQueue = new Bull('analyze_photo', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});

export const fetchSatelliteQueue = new Bull('fetch_satellite', {
  redis: { ... }
});

export const fetchWeatherQueue = new Bull('fetch_weather', {
  redis: { ... }
});

export const compareAnalysisQueue = new Bull('compare_analysis', {
  redis: { ... }
});

export const aggregateRegionalQueue = new Bull('aggregate_regional', {
  redis: { ... },
  defaultJobOptions: {
    // Run hourly at :00 UTC
    repeat: { pattern: '0 * * * *' }
  }
});
```

**Job Processors (Workers):**

```typescript
// backend/src/workers/analyzePhoto.ts

analyzePhotoQueue.process(async (job) => {
  const { observationId, photoBinary } = job.data;
  
  try {
    // Convert to base64
    const b64 = photoBinary.toString('base64');
    
    // Call Gemini API
    const result = await geminiService.analyzePhoto(b64);
    
    // Store in DB
    await db.analysisResults.updateOne(
      { observationId },
      { $set: { gemini_result: result } }
    );
    
    return { success: true };
  } catch (error) {
    throw error; // Bull will retry automatically
  }
});

// Retry strategy
analyzePhotoQueue.on('failed', (job, err) => {
  if (job.attemptsMade < job.opts.attempts) {
    console.log(`Retry #${job.attemptsMade} for job ${job.id}`);
  } else {
    // Mark observation as failed
    db.observations.updateOne(
      { _id: ObjectId(job.data.observationId) },
      { $set: { status: 'error', errorMessage: err.message } }
    );
  }
});
```

### 3.2 Execution Diagram

```
USER SUBMITS OBSERVATION
        ↓
[Backend validates, saves to DB with status="pending"]
        ↓
QUEUE 3 PARALLEL JOBS:
├── Job1: analyzePhoto(photo) → 2-5 sec
├── Job2: fetchSatellite(lat,lng) → 5-30 sec
└── Job3: fetchWeather(lat,lng) → 1-3 sec
        ↓ [All 3 complete, in any order]
QUEUE COMPARISON JOB:
├── compareAnalysis({gemini, satellite, weather})
├── Calculate confidence score
├── Detect anomalies
└── Generate recommendations
        ↓
[Mark observation status="completed"]
        ↓
[Frontend polls, receives results]
```

### 3.3 Confidence Scoring Algorithm

**Goal:** Single number (0-100) representing overall confidence in water presence assessment.

**Formula:**

```
confidence = (0.40 × gemini_conf) 
           + (0.40 × satellite_conf) 
           + (0.20 × agreement_score)

where:

  gemini_conf = confidence from Gemini (0-100) directly

  satellite_conf = {
    80  if NDWI > 0.5 (definitely water)
    60  if NDWI 0.3-0.5 (likely water)
    40  if NDWI 0-0.3 (maybe water)
    20  if NDWI < 0 (probably not water)
    0   if no satellite data available
  }

  agreement_score = {
    100 if both high (both > 60)
    100 if both low (both < 40)
    50  if mixed (one high, one low)
  }
```

**Water Presence Verdict:**

```
if confidence >= 75: "HIGH" (⚠️ warning)
else if confidence >= 50: "MEDIUM" (⚠️ caution)
else if confidence >= 25: "LOW" (ℹ️ info)
else: "NONE" (✓ clear)
```

**Example Scenarios:**

| Scenario | Gemini | Satellite | Agreement | Final Conf | Verdict |
|----------|--------|-----------|-----------|------------|---------|
| Both high | 85 | 80 | 100 | 82.5 | HIGH |
| Both low | 20 | 20 | 100 | 20 | NONE |
| Gemini high, Sat low | 80 | 30 | 50 | 55 | MEDIUM |
| No satellite | 70 | 0 | - | 28 | LOW |

---

## 4. FRONTEND ARCHITECTURE

### 4.1 Page Hierarchy

```
App
├── Layout (header, nav, footer)
│   ├── Home / Dashboard
│   │   ├── Hero section
│   │   ├── Map (recent observations)
│   │   └── Stats cards
│   ├── Submit Observation
│   │   ├── LocationSelector (map + geo)
│   │   ├── PhotoCapture (camera UI)
│   │   └── FormControls (submit)
│   ├── Results (/:observationId)
│   │   ├── PhotPanel
│   │   ├── AnalysisPanel
│   │   ├── MapPanel
│   │   └── DetailPanel
│   ├── Explore (map view)
│   │   ├── InteractiveMap
│   │   ├── Heatmap overlay
│   │   ├── Filters
│   │   └── RegionalStats
│   └── Methodology (static page)
```

### 4.2 State Management with Zustand

**Store Structure:**

```typescript
// frontend/src/store/observationStore.ts

import create from 'zustand';

interface ObservationState {
  // Current observation
  currentObservationId: string | null;
  currentObservation: Observation | null;
  analysisResults: AnalysisResults | null;
  loading: boolean;
  error: string | null;
  
  // Recent observations list
  observations: Observation[];
  
  // UI state
  mapCenter: [number, number];
  mapZoom: number;
  selectedFilter: {
    dateRange: [Date, Date];
    confidenceMin: number;
    waterPresenceLevel: 'any' | 'high' | 'medium' | 'low' | 'none';
  };
  
  // Actions
  setCurrentObservation: (id: string) => void;
  submitObservation: (data: ObservationInput) => Promise<void>;
  pollAnalysisResults: (id: string, maxRetries?: number) => Promise<void>;
  fetchObservations: (filters?: any) => Promise<void>;
  updateFilters: (filters: any) => void;
}

export const useObservationStore = create<ObservationState>((set, get) => ({
  // ... implementation
}));
```

### 4.3 API Client (React Query)

```typescript
// frontend/src/services/api.ts

import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';

export const queryClient = new QueryClient();

// Hooks for data fetching
export function useObservation(observationId: string) {
  return useQuery({
    queryKey: ['observation', observationId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/observations/${observationId}`);
      return res.json();
    },
    enabled: !!observationId,
    refetchInterval: 2000, // Poll every 2 sec while processing
  });
}

export function useAnalysisResults(observationId: string) {
  return useQuery({
    queryKey: ['analysis', observationId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/observations/${observationId}/analysis`);
      return res.json();
    },
    enabled: !!observationId,
    refetchInterval: 2000,
  });
}

export function useSubmitObservation() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/v1/observations', {
        method: 'POST',
        body: formData, // Auto-encodes multipart/form-data
      });
      if (!res.ok) throw new Error('Failed to submit');
      return res.json();
    },
  });
}
```

### 4.4 Map Integration

**Leaflet Setup:**

```typescript
// frontend/src/components/MapView.tsx

import { MapContainer, TileLayer, Marker, Popup, Heatmap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

export function MapView({ observations, center, zoom, onMarkerClick }) {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '400px', width: '100%' }}
    >
      {/* Base tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      
      {/* Markers for observations */}
      {observations.map((obs) => (
        <Marker 
          key={obs._id} 
          position={[obs.latitude, obs.longitude]}
          onClick={() => onMarkerClick(obs._id)}
        >
          <Popup>
            <strong>{obs.confidence}% confidence</strong>
            <p>Water presence: {obs.waterPresence}</p>
          </Popup>
        </Marker>
      ))}
      
      {/* Heatmap overlay of water presence */}
      <Heatmap
        points={observations.map(obs => [
          obs.latitude,
          obs.longitude,
          obs.confidence / 100 // Intensity 0-1
        ])}
        radius={50}
        blur={15}
        max={1}
      />
    </MapContainer>
  );
}
```

### 4.5 Form Validation (React Hook Form + Zod)

```typescript
// frontend/src/components/ObservationForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photo: z
    .instanceof(File)
    .refine(f => f.size < 5000000, 'Photo must be < 5MB')
    .refine(f => ['image/jpeg', 'image/png'].includes(f.type), 'Only JPEG/PNG'),
});

type ObservationFormData = z.infer<typeof schema>;

export function ObservationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ObservationFormData>({
    resolver: zodResolver(schema),
  });
  
  const submitMutation = useSubmitObservation();
  
  async function onSubmit(data: ObservationFormData) {
    const formData = new FormData();
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    formData.append('photo', data.photo);
    
    const result = await submitMutation.mutateAsync(formData);
    // Navigate to results page
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('latitude')} type="number" />
      {errors.latitude && <span>{errors.latitude.message}</span>}
      
      <input {...register('longitude')} type="number" />
      {errors.longitude && <span>{errors.longitude.message}</span>}
      
      <input {...register('photo')} type="file" accept="image/*" />
      {errors.photo && <span>{errors.photo.message}</span>}
      
      <button type="submit" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? 'Submitting...' : 'Submit Observation'}
      </button>
    </form>
  );
}
```

---

## 5. BACKEND ARCHITECTURE

### 5.1 ElysiaJS Server Structure

```typescript
// backend/src/index.ts

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { mongoose } from '@elysiajs/mongoose';

import authRouter from './api/auth';
import observationRouter from './api/observations';
import analysisRouter from './api/analysis';

const app = new Elysia()
  .use(cors())
  .use(jwt({ secret: process.env.JWT_SECRET }))
  .use(mongoose())
  
  // Global middleware
  .middleware(async ({ request, set }) => {
    console.log(`${request.method} ${request.url}`);
    
    // Add request ID for tracing
    set.headers['x-request-id'] = crypto.randomUUID();
  })
  
  // Error handling
  .error({ BadRequest: BadRequestException })
  .onError(({ error, set }) => {
    if (error instanceof BadRequestException) {
      set.status = 400;
      return { error: error.message };
    }
    set.status = 500;
    return { error: 'Internal server error' };
  })
  
  // Routes
  .use(authRouter)
  .use(observationRouter)
  .use(analysisRouter)
  
  // Health check
  .get('/health', () => ({ status: 'ok' }))
  
  .listen(3000);

console.log('Server running on http://localhost:3000');
```

### 5.2 Observation Endpoint

```typescript
// backend/src/api/observations.ts

import { Elysia } from 'elysia';
import { Observation, AnalysisResult } from '../models';
import * as queues from '../queues';

export default new Elysia({ prefix: '/api/v1' })
  
  .post('/observations', async ({ body, set, jwt }) => {
    // Extract from multipart form
    const { latitude, longitude, photo } = body; // Formidable handles multipart
    
    // Validate
    if (!latitude || !longitude) {
      set.status = 400;
      throw new BadRequestException('Missing latitude or longitude');
    }
    
    if (!photo) {
      set.status = 400;
      throw new BadRequestException('Missing photo');
    }
    
    // Read photo into buffer
    const photoBinary = await photo.arrayBuffer();
    
    // Create observation document
    const observation = new Observation({
      userId: jwt.verify(body.token)?.userId || 'anonymous',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      photoHash: hashPhoto(photoBinary), // SHA256
      photoUrl: `/uploads/${uuidv4()}.jpg`, // Save later
      timestamp: new Date(),
      status: 'pending',
    });
    
    await observation.save();
    
    // Save photo to storage
    await storage.upload(observation.photoUrl, photoBinary);
    
    // Queue analysis jobs
    await queues.analyzePhotoQueue.add(
      { observationId: observation._id, photoBinary },
      { priority: 10 }
    );
    
    await queues.fetchSatelliteQueue.add(
      { observationId: observation._id, latitude, longitude },
      { priority: 10 }
    );
    
    await queues.fetchWeatherQueue.add(
      { observationId: observation._id, latitude, longitude },
      { priority: 10 }
    );
    
    set.status = 201;
    return {
      observation_id: observation._id,
      status: 'accepted',
      message: 'Observation queued for analysis'
    };
  }, {
    body: t.Object({
      latitude: t.Number(),
      longitude: t.Number(),
      photo: t.File(),
    })
  })
  
  .get('/observations/:id', async ({ params }) => {
    const obs = await Observation.findById(params.id);
    if (!obs) {
      throw new NotFoundException('Observation not found');
    }
    return obs;
  })
  
  .get('/observations/:id/analysis', async ({ params }) => {
    const analysis = await AnalysisResult.findOne({
      observationId: params.id
    });
    
    if (!analysis) {
      return { status: 'processing' };
    }
    
    return {
      status: 'completed',
      confidence: analysis.analysis.confidence_score,
      water_presence: analysis.analysis.water_presence_likelihood,
      gemini: analysis.gemini_result,
      satellite: analysis.satellite_data,
      weather: analysis.weather_data,
      risk_indicators: analysis.analysis.risk_indicators,
    };
  });
```

### 5.3 Queue Job Processors

**Photo Analysis Job:**

```typescript
// backend/src/workers/photoAnalysis.ts

import { analyzePhotoQueue } from '../queues';
import { geminiService } from '../external/gemini';
import { AnalysisResult } from '../models';

analyzePhotoQueue.process('analyze-photo', async (job) => {
  const { observationId, photoBinary } = job.data;
  
  try {
    // Convert to base64
    const b64 = Buffer.from(photoBinary).toString('base64');
    
    // Call Gemini
    const result = await geminiService.analyzePhoto(
      b64,
      'image/jpeg'
    );
    
    // Update analysis result
    await AnalysisResult.updateOne(
      { observationId },
      { $set: { gemini_result: result } },
      { upsert: true }
    );
    
    // Check if all jobs complete
    await checkIfAllComplete(observationId);
    
    return { success: true };
  } catch (error) {
    console.error(`Photo analysis failed: ${error}`);
    throw error; // Bull will retry
  }
});

async function checkIfAllComplete(observationId) {
  const analysis = await AnalysisResult.findOne({ observationId });
  
  if (
    analysis.gemini_result &&
    analysis.satellite_data &&
    (analysis.weather_data || true) // Weather optional
  ) {
    // All ready, trigger comparison
    await queues.compareAnalysisQueue.add(
      { observationId },
      { priority: 5 }
    );
  }
}
```

**Comparison Job:**

```typescript
// backend/src/workers/compareAnalysis.ts

import { compareAnalysisQueue } from '../queues';
import { AnalysisResult, Observation } from '../models';
import { calculateConfidence } from '../services/analysis';

compareAnalysisQueue.process('compare-analysis', async (job) => {
  const { observationId } = job.data;
  
  const analysis = await AnalysisResult.findOne({ observationId });
  
  if (!analysis) {
    throw new Error('Analysis not found');
  }
  
  // Calculate confidence score
  const confidence = calculateConfidence(
    analysis.gemini_result.waterPresenceConfidence,
    analysis.satellite_data.ndwiValue,
    analysis.gemini_result.waterPresence,
    analysis.satellite_data.hasWaterFeature
  );
  
  // Generate verdict
  let verdict = 'none';
  if (confidence >= 75) verdict = 'high';
  else if (confidence >= 50) verdict = 'medium';
  else if (confidence >= 25) verdict = 'low';
  
  // Detect anomalies
  const anomalies = [];
  if (
    Math.abs(
      analysis.gemini_result.waterPresenceConfidence - 
      (analysis.satellite_data.hasWaterFeature ? 80 : 20)
    ) > 40
  ) {
    anomalies.push('Gemini and satellite disagree on water presence');
  }
  
  if (analysis.satellite_data.cloudCover > 50) {
    anomalies.push('High cloud cover - satellite data unreliable');
  }
  
  // Update document
  await AnalysisResult.updateOne(
    { observationId },
    {
      $set: {
        'analysis.confidence_score': confidence,
        'analysis.water_presence_likelihood': verdict,
        'analysis.anomalies': anomalies,
        'analysis.recommendation': generateRecommendation(verdict),
        processedAt: new Date(),
        processingTime_ms: job.progress() // Estimate
      }
    }
  );
  
  // Mark observation as complete
  await Observation.updateOne(
    { _id: observationId },
    { $set: { status: 'completed', updatedAt: new Date() } }
  );
  
  return { success: true, confidence };
});

function generateRecommendation(verdict: string) {
  const recs = {
    high: 'Water presence confirmed. Recommend site visit or emergency response if in flood area.',
    medium: 'Possible water presence. Recommend ground verification.',
    low: 'Limited water presence detected. Continue monitoring.',
    none: 'No water detected. Continue regular monitoring.'
  };
  return recs[verdict];
}
```

---

## 6. KEY DECISION RATIONALES

### 6.1 Why Bun + ElysiaJS?

**Decision:** Use Bun runtime + ElysiaJS framework instead of Node + Express.

**Rationale:**
- **Speed:** Bun is 4x faster than Node.js (Elysia benchmarks: 30k req/s vs 8k for Express)
- **Developer experience:** You're familiar with it (you've worked with it in other projects)
- **TypeScript native:** No transpilation needed
- **Simplicity:** Elysia is more lightweight than Express + many plugins

**Trade-offs:**
- Smaller ecosystem (fewer third-party packages)
- Bun still newer (released 2023), less battle-tested than Node
- Some compatibility issues with npm packages

**Mitigation:**
- Lock dependencies with `bun.lockb`
- Test thoroughly before production
- Have Node.js fallback ready if needed

### 6.2 Why MongoDB + PostgreSQL?

**Decision:** Use BOTH databases (not just one).

**Rationale:**
```
MongoDB: observations + analysis_results (flexible schema)
├─ Rapidly evolving data structure
├─ Nested documents (gemini_result, satellite_data, etc.)
├─ Easy scaling (automatic sharding)
└─ Good for hackathon (quick iterations)

PostgreSQL: time_series + spatial (structured data)
├─ Time-series queries (group by hour/day/week)
├─ Geospatial queries (PostGIS extension)
├─ Better for analytics/reporting
└─ ACID transactions
```

**Trade-offs:**
- Complex to maintain 2 databases
- Operational overhead
- Data sync issues if not careful

**Mitigation:**
- MongoDB is source of truth
- PostgreSQL is denormalized copy (eventual consistency)
- Sync via change streams or message queue

---

## 7. RISK MITIGATION STRATEGIES

### 7.1 API Rate Limits & Quotas

| API | Limit | Mitigation |
|-----|-------|-----------|
| **Gemini Vision** | 50k/month | Cache results, batch processing |
| **Earth Engine** | Variable | GEE quotas, fallback to cached satellite |
| **BMKG** | Unknown (unreliable) | Skip gracefully, don't block |
| **OpenWeather** | 60/min (free) | Use sparingly, fallback to BMKG |

**Implementation:**
```typescript
// Before calling expensive APIs, check quotas
class APIQuotaManager {
  private quotas = new Map();
  
  canCall(apiName: string): boolean {
    const quota = this.quotas.get(apiName);
    if (!quota) return true;
    
    return quota.remaining > 0;
  }
  
  recordCall(apiName: string) {
    const quota = this.quotas.get(apiName);
    if (quota) {
      quota.remaining--;
      quota.lastReset = Date.now();
    }
  }
  
  reset(apiName: string) {
    // Reset on schedule (hourly, daily, etc)
  }
}
```

### 7.2 Data Validation & Sanitization

**Photo Upload:**
- Size check (< 5MB)
- Format check (JPEG/PNG only)
- Virus scan (optional, use ClamAV or service)
- Store with hashed filename (prevent path traversal)

**Location:**
- Validate range (-90..90 lat, -180..180 lng)
- Check precision (not more than 6 decimals = 0.1m)
- Prevent spam (rate limit: max 10 observations/day per user)

**API Responses:**
- Schema validation (Zod, Joi, or Yup)
- Type checking (TypeScript at compile time)
- Timeout protection (all API calls have timeouts)

### 7.3 Error Handling & Observability

**Sentry for Error Tracking:**
```typescript
import Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
});

// Automatic error capture
app.onError(({ error }) => {
  Sentry.captureException(error);
});
```

**Structured Logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('Observation submitted', { observationId, lat, lng });
logger.error('Gemini API failed', { error: err.message, retryCount: 2 });
```

**Monitoring Metrics:**
```typescript
// Track key metrics
const metrics = {
  observations_submitted: 0,
  observations_completed: 0,
  observations_failed: 0,
  avg_processing_time_ms: 0,
  gemini_api_failures: 0,
  satellite_api_failures: 0,
  confidence_distribution: {} // Histogram
};

// Expose on /metrics endpoint for Prometheus scraping
app.get('/metrics', () => formatPrometheusMetrics(metrics));
```

### 7.4 Database Backup & Recovery

**MongoDB:**
```bash
# Automated daily backups
0 2 * * * mongodump --uri="${MONGO_URI}" --out=/backups/mongo_$(date +%Y%m%d)

# Test restore monthly
mongorestore /backups/mongo_20260515
```

**PostgreSQL:**
```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/pg_$(date +%Y%m%d).sql.gz

# Point-in-time recovery enabled
```

**Data Retention Policy:**
- Keep observations forever (source of truth)
- Delete photos after 30 days (save storage cost)
- Archive old analysis results to cold storage (S3 Glacier)

---

## CONCLUSION

This document provides the implementation details for building a production-ready water presence monitoring system. Key takeaways:

1. **Parallel processing** is critical (GEE queries are slow, must not block)
2. **Caching** reduces costs and improves responsiveness
3. **Error handling** must be graceful (weather unavailable ≠ system broken)
4. **Database choice** matters (MongoDB for flexibility, PostgreSQL for analytics)
5. **Testing** required before launch (5-10 real observations to validate accuracy)

**Next steps:**
1. Set up local dev environment with Docker Compose
2. Start with frontend (form + map)
3. Build backend API endpoints
4. Integrate Gemini + GEE one at a time
5. Test end-to-end
6. Deploy to staging
7. Gather user feedback
8. Launch

Good luck! 🚀

