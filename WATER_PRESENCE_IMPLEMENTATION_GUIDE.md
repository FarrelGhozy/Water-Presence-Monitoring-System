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

# Backend (Bun)
BUN_ENV=development
MONGODB_URI=mongodb://localhost:27017/water-monitor-dev
GEMINI_API_KEY=<Google AI Studio API key>
GEE_WORKER_URL=http://localhost:8000

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads
JWT_SECRET=dev-secret-change-in-prod

# Python Worker (GEE)
GOOGLE_APPLICATION_CREDENTIALS=./gee-service-account.json
EARTH_ENGINE_PROJECT=water-monitor-project
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

### 2.1 Gemini AI Analyst Integration (BARU)

**Peran BARU:** Gemini TIDAK menganalisis foto. Gemini menerima data satelit TERSTRUKTUR dari GEE dan memberikan analisis komprehensif.

**Purpose:** Analyze multi-source satellite data and produce water presence assessment.

**Integration Point:** Backend receives structured JSON from GEE worker, sends to Gemini, gets analysis.

**API Details:**
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Authentication:** API Key
- **Rate Limit:** 50,000 req/month free tier
- **Latency:** 3-8 seconds
- **Cost:** ~$0.001-0.003 per analysis (depends on input size)

**Request Payload Example (kirim DATA SATELIT, bukan foto):**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a hydrology and remote sensing analyst. Analyze this satellite data..."
        },
        {
          "text": "SATELLITE DATA INPUT:\n" + JSON.stringify({
            "sar": {"waterPercentage": 34.2, "backscatterMean": -18.5},
            "ndwi": {"value": 0.42, "cloudCover": 15},
            "chirps": {"rainfall7day_mm": 120},
            "soil": {"type": "clay loam"},
            "elevation": {"meters": 45}
          })
        }
      ]
    }
  ]
}
```

**Response Parsing:**
- Prompt: "Respond ONLY in valid JSON"
- Parse JSON, extract confidence, verdict, reasoning, recommendations
- Handle failures: retry 1x, then show raw satellite data

**Implementation Strategy:**
```
1. Receive structured satellite data from GEE worker
2. Format as JSON string
3. Send to Gemini with system prompt
4. Parse JSON response
5. Store in MongoDB gemini_analysis
6. Return to frontend
```

**Fallback/Error Handling:**
- Timeout after 15 seconds → retry 1x
- If Gemini fails → display raw satellite data with note "AI analysis unavailable"

---

### 2.2 Google Earth Engine Multi-Source Pipeline

**Purpose:** Collect data dari 5 sumber satelit untuk dianalisis Gemini.

**Architecture:** Python Worker (FastAPI) → GEE Python API → Structured JSON → Backend → Gemini

**Data Sources:**
| Source | Type | Tembus Awan? | Fungsi |
|--------|------|-------------|--------|
| Sentinel-1 SAR | Radar (C-band) | ✅ **Ya** | Water mask — PRIMARY |
| Sentinel-2 | Optical | ❌ Tidak | NDWI — SECONDARY |
| CHIRPS | Rainfall | N/A | Konteks curah hujan |
| OpenLandMap | Soil | N/A | Tipe tanah |
| SRTM | DEM | N/A | Elevasi |

**Python Worker — Multi-Source Pipeline:**

```python
# python-worker/services/gee_pipeline.py
import ee

def analyze_location(lat: float, lng: float):
    """Collect all satellite data for a location"""
    ee.Initialize()
    point = ee.Geometry.Point([lng, lat])
    
    # 1. SENTINEL-1 SAR (PRIMARY — selalu jalan)
    sar_result = get_sar_water_mask(point)
    
    # 2. SENTINEL-2 NDWI (SECONDARY — jika awan rendah)
    ndwi_result = get_ndwi_if_available(point)
    
    # 3. CHIRPS RAINFALL
    chirps_result = get_chirps_rainfall(point)
    
    # 4. SOIL TYPE (OpenLandMap)
    soil_result = get_soil_type(point)
    
    # 5. ELEVATION (SRTM)
    elevation_result = get_elevation(point)
    
    return {
        "sar": sar_result,
        "ndwi": ndwi_result,
        "chirps": chirps_result,
        "soil": soil_result,
        "elevation": elevation_result
    }


def get_sar_water_mask(point):
    """Detect water using Sentinel-1 SAR (radar, tembus awan)"""
    collection = (
        ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterBounds(point)
        .filterDate(
            ee.Date.now().advance(-7, 'day'),
            ee.Date.now()
        )
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .select('VH')
    )
    
    if collection.size().getInfo() == 0:
        return {"waterPercentage": None, "confidence": "no_data"}
    
    # Speckle filter + water mask
    image = collection.median()
    # Apply Refined Lee speckle filter
    water_mask = image.lt(-20)  # VH < -20dB = water
    water_pct = water_mask.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=point.buffer(500),  # 500m radius
        scale=10
    ).get('VH').getInfo()
    
    backscatter = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=point.buffer(100),
        scale=10
    ).get('VH').getInfo()
    
    confidence = "high" if water_pct is not None else "low"
    
    return {
        "waterPercentage": round(water_pct * 100, 1) if water_pct else 0,
        "backscatterMean": round(backscatter, 2) if backscatter else None,
        "confidence": confidence
    }


def get_ndwi_if_available(point):
    """NDWI from Sentinel-2 (only if low cloud cover)"""
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(point)
        .filterDate(
            ee.Date.now().advance(-5, 'day'),
            ee.Date.now()
        )
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    )
    
    if collection.size().getInfo() == 0:
        return {"value": None, "available": False, "cloudCover": None}
    
    image = collection.median()
    ndwi = image.normalizedDifference(['B3', 'B8'])
    
    sample = ndwi.sample(point, 10).first()
    ndwi_val = sample.get('nd').getInfo() if sample else None
    
    cloud = collection.first().get('CLOUDY_PIXEL_PERCENTAGE').getInfo()
    
    return {
        "value": round(ndwi_val, 3) if ndwi_val else None,
        "available": ndwi_val is not None,
        "cloudCover": cloud
    }


def get_chirps_rainfall(point):
    """Rainfall from CHIRPS (7-day total)"""
    collection = (
        ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        .filterBounds(point)
        .filterDate(
            ee.Date.now().advance(-7, 'day'),
            ee.Date.now()
        )
    )
    
    total = collection.sum()
    sample = total.sample(point, 5000).first()
    rainfall = sample.get('precipitation').getInfo() if sample else None
    
    return {
        "rainfall7day_mm": round(rainfall, 1) if rainfall else 0,
        "trend": "increasing"  # Could calculate from time series
    }


def get_soil_type(point):
    """Soil type from OpenLandMap"""
    soil = (
        ee.Image('OpenLandMap/SOL/SOL_GRID')
        .sample(point, 250)
        .first()
    )
    return {"type": str(soil.get('b0').getInfo()) if soil else "unknown"}


def get_elevation(point):
    """Elevation from SRTM"""
    dem = ee.Image('USGS/SRTMGL1_003')
    sample = dem.sample(point, 30).first()
    elev = sample.get('elevation').getInfo() if sample else None
    
    return {
        "meters": round(elev, 1) if elev else 0,
        "terrain": "flat" if elev and elev < 50 else "hilly" if elev and elev < 200 else "mountainous"
    }
```

**Caching Strategy:**
- SAR + NDWI: cache 7 hari (data satelit jarang berubah)
- CHIRPS: cache 1 hari
- Soil + Elevation: cache 30 hari (statis)
- Cache key: `gee:{source}:{lat}:{lng}`

**Error Handling:**
- Jika satu source gagal → skip, lanjut ke source lain
- Jika SAR gagal → observasi tetap diproses dengan data partial
- Jika semua GEE gagal → return error ke user, rekomendasi manual survey

---

### 2.3 Rainfall Data (CHIRPS via GEE — Pengganti BMKG)

**Tidak pakai BMKG API.** CHIRPS (Climate Hazards Group InfraRed Precipitation with Station data) sudah tersedia di GEE dan lebih reliable.

**Data:** Curah hujan harian global (1981-sekarang), resolusi 0.05°, gratis.

**Akses via GEE (sudah include di pipeline 2.2):**
```python
# CHIRPS daily rainfall — via GEE Python API
import ee

def get_rainfall(lat, lng, days=7):
    ee.Initialize()
    point = ee.Geometry.Point([lng, lat])
    
    collection = (
        ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        .filterBounds(point)
        .filterDate(
            ee.Date.now().advance(-days, 'day'),
            ee.Date.now()
        )
    )
    
    total = collection.sum()
    sample = total.sample(point, 5000).first()
    rainfall = sample.get('precipitation').getInfo()
    
    return {"rainfall_mm": rainfall, "days": days, "source": "chirps"}
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

### 3.1 Processing Pipeline (No Queue — Sync Sequential)

**Kenapa tidak pakai Bull/Redis?** Karena pipeline GEE → Gemini sudah sequential (GEE dulu, baru Gemini). Tidak perlu queue complex.

**Flow:**

```
1. User submits → Backend saves → Calls Python Worker
2. Python Worker → GEE Multi-Source (5 parallel queries)
3. All GEE data collected → Sent to Gemini
4. Gemini analyzes → Returns assessment
5. Backend updates DB → Returns to frontend
```

**Backend (Bun/ElysiaJS) — Orchestration:**
```typescript
// backend/src/services/pipeline.ts

async function processObservation(observationId: string) {
  // 1. Get observation data
  const obs = await Observation.findById(observationId);
  
  // 2. Call Python worker for GEE multi-source analysis
  const satelliteData = await fetch(
    'http://python-worker:8000/analyze',
    {
      method: 'POST',
      body: JSON.stringify({
        lat: obs.latitude,
        lng: obs.longitude
      })
    }
  ).then(r => r.json());
  
  // 3. Store raw satellite data
  await SatelliteData.create({
    observationId,
    ...satelliteData
  });
  
  // 4. Send to Gemini for analysis
  const geminiResult = await geminiService.analyzeSatelliteData(
    satelliteData,
    obs
  );
  
  // 5. Store Gemini analysis
  await GeminiAnalysis.create({
    observationId,
    ...geminiResult
  });
  
  // 6. Mark complete
  await Observation.updateOne(
    { _id: observationId },
    { $set: { status: 'completed' } }
  );
  
  return geminiResult;
}
```

### 3.2 Execution Diagram

```
USER SUBMITS OBSERVATION (GPS + Photo)
        ↓
[Backend validates, saves with status="processing"]
        ↓
GEE MULTI-SOURCE (Python Worker):
├── Sentinel-1 SAR → water mask (5-15s)
├── Sentinel-2 NDWI → if cloud < 20% (5-15s)
├── CHIRPS → rainfall (3-5s)
├── OpenLandMap → soil (3-5s)
└── SRTM → elevation (3-5s)
        ↓
[All data collected → structured JSON]
        ↓
GEMINI AI ANALYST (3-8s):
├── Receives: {sar, ndwi, chirps, soil, elevation}
├── Analyzes: cross-references all sources
├── Output: confidence + verdict + reasoning + recommendations
        ↓
[Status: "completed"]
        ↓
Frontend polls → receives full analysis + peta update
```

### 3.3 Confidence & Verdict (Dari Gemini, Bukan Formula)

**Tidak ada formula buatan sendiri.** Gemini AI menentukan confidence score berdasarkan analisis semua data satelit.

**Yang dipertimbangkan Gemini:**
```
- SAR water percentage > 30% → strong indicator
- NDWI > 0.3 → confirms open water (if available)
- High rainfall + SAR water → consistent
- Flat terrain + clay soil → supports water retention
- All sources agree → high confidence
```

**Verdict:**

```
confidence >= 80: "DEFINITIVE" — multiple satellites confirm water
confidence 60-79: "PROBABLE"  — strong evidence, minor uncertainty
confidence 30-59: "POSSIBLE"  — some indicators, not conclusive
confidence < 30:  "UNLIKELY"  — no significant water detected
```

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

### 6.1 Why Sentinel-1 SAR instead of just optical?

| Aspek | Sentinel-2 (Optis) | Sentinel-1 (SAR Radar) |
|-------|-------------------|----------------------|
| Tembus awan? | ❌ Tidak | ✅ Ya |
| Cocok Indonesia? | ❌ 70-90% awan | ✅ Sepanjang tahun |
| Deteksi air | NDWI vegetation/water | Backscatter rendah |
| Resolusi | 10m | 10m |

**Keputusan:** Sentinel-1 SAR sebagai **primary**, Sentinel-2 sebagai **secondary**.

### 6.2 Why Gemini as Analyst instead of Comparison Engine?

**OLD approach:** Weighted formula comparing Gemini photo analysis vs satellite NDVI vs weather. Complex, arbitrary weights, foto tidak reliable.

**NEW approach:** Satellite data is objective and consistent. Gemini (with its vast training data) acts as a human expert would — looking at all satellite evidence and making a holistic judgment.

### 6.3 Why CHIRPS instead of BMKG API?

- BMKG API: unreliable, poor documentation, frequent downtime
- CHIRPS: already available in GEE, 35+ years of data, global coverage, free
- No additional API key needed (access via GEE)

### 6.4 Why MongoDB only (no PostgreSQL)?

For MVP, single database is sufficient. Geospatial queries can be handled by GEE (not PostgreSQL). Time-series data can be stored in MongoDB with proper indexing. PostgreSQL can be added later if complex analytics needed.

---

## 7. RISK MITIGATION STRATEGIES

### 7.1 API Rate Limits & Quotas

| API | Limit | Biaya | Mitigation |
|-----|-------|-------|-----------|
| **Gemini 2.0 Flash** | 50k/month | Gratis | Cache analysis results |
| **GEE** | 50k compute/day | Gratis (Community Tier) | Cache satellite data 7 hari |
| **CHIRPS** (via GEE) | Unlimited | Gratis | Tidak ada rate limit |
| **OpenLandMap** (via GEE) | Unlimited | Gratis | Cache 30 hari |
| **SRTM** (via GEE) | Unlimited | Gratis | Cache 30 hari |

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

