# WATER PRESENCE MONITORING SYSTEM
## Comprehensive System Design Document

**Status:** Pre-Development Design  
**Last Updated:** May 2026  
**Project Type:** Hackathon / Competition Entry

---

## 1. SYSTEM OVERVIEW

### 1.1 Vision & Mission
Create a **citizen science + AI-powered platform** for real-time water presence monitoring via crowdsourced observations combined with satellite data validation.

**Key Insight:** Single photo + smartphone is not enough for accurate water detection, especially in tropical Indonesia with 70-90% cloud cover. Instead, use **multi-source satellite analysis** as primary detection (Sentinel-1 SAR radar + Sentinel-2 NDWI + CHIRPS rainfall + soil + elevation), with Gemini AI as an **intelligent analyst** that interprets all satellite data and produces a comprehensive confidence score and natural language assessment.

### 1.2 Core Value Proposition
- **Satellite-First:** Multi-source satellite analysis (SAR + NDWI + CHIRPS + soil + DEM) — lebih akurat
- **AI-Powered Interpretation:** Gemini AI menganalisis semua data satelit, bukan foto
- **Tembus Awan:** Sentinel-1 SAR radar works regardless of cloud cover
- **Peta Indonesia Otomatis:** Choropleth map per provinsi dari data satelit
- **Accessible:** Hasil setara analis remote sensing, untuk masyarakat umum

### 1.3 Target Use Cases
1. **Disaster response:** Rapid flood/water body mapping after events
2. **Agricultural planning:** Quick assessment for irrigation planning
3. **Water resource survey:** Baseline surveys for dry regions
4. **Public participation:** Citizen science project for environmental awareness

---

## 2. TECHNICAL ARCHITECTURE

### 2.1 Deployment Model

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Vercel)                                       │
│ - React + Vite + Tailwind                              │
│ - Leaflet.js + Choropleth Map Indonesia                │
└─────────────────────────────────────────────────────────┘
                        ↓
                (HTTPS REST API)
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (Railway)                                       │
│ - Bun runtime + ElysiaJS (sederhana)                   │
│ - REST API (6 endpoints)                               │
│ - Gemini 2.0 Flash integration                         │
│ - MongoDB storage                                      │
└─────────────────────────────────────────────────────────┘
         ↓                    ↓
    ┌────────────┐    ┌──────────────────────────────┐
    │ MongoDB    │    │ Python Worker                │
    │ (Atlas)    │    │ GEE Multi-Source Pipeline    │
    │Observations│    ├─ Sentinel-1 SAR (tembus awan)│
    │Results     │    ├─ Sentinel-2 NDWI             │
    │Regional    │    ├─ CHIRPS rainfall             │
    │Index       │    ├─ OpenLandMap soil            │
    └────────────┘    └─ SRTM elevation             │
                      └──────────────────────────────┘
                               ↓
                      ┌──────────────────┐
                      │ Google Earth     │
                      │ Engine (API)     │
                      │ Semua data       │
                      │ satelit gratis   │
                      └──────────────────┘
```

### 2.2 Database Schema (Satu Database — MongoDB)

#### Collection: `observations`
```
{
  _id: ObjectId,
  userId: string,
  latitude: number,
  longitude: number,
  province: string,
  timestamp: Date,
  photoUrl: string,
  status: "processing" | "completed" | "error",
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `satellite_data`
```
{
  _id: ObjectId,
  observationId: ObjectId,
  
  sar_analysis: {
    waterPercentage: number (0-100),
    backscatterMean: number,
    waterMaskUrl: string,
    confidence: "high" | "medium" | "low"
  },
  
  ndwi: {
    value: number (-1 to 1) | null,
    cloudCover: number | null,
    available: boolean
  },
  
  chirps: {
    rainfall7day_mm: number,
    trend: "increasing" | "decreasing" | "stable",
    anomaly: number | null
  },
  
  soil: {
    type: string,
    drainage: string
  },
  
  elevation: {
    meters: number,
    terrain: string
  },
  
  createdAt: Date
}
```

#### Collection: `gemini_analysis`
```
{
  _id: ObjectId,
  observationId: ObjectId,
  
  confidence: number (0-100),
  verdict: "definitive" | "probable" | "possible" | "unlikely",
  reasoning: string,
  contributingFactors: [string],
  anomalies: [string],
  recommendations: [string],
  
  createdAt: Date,
  processedAt: Date,
  processingTime_ms: number
}
```

#### Collection: `regional_index`
```
{
  _id: ObjectId,
  province: string (unique),
  waterIndex: number (0-100),
  waterPercentage: number,
  observationCount: number,
  lastUpdated: Date,
  historicalTrend: [{
    date: Date,
    waterIndex: number
  }]
}
```

---

## 3. DETAILED COMPONENT BREAKDOWN

### 3.1 Frontend (React + Vite)

#### Pages/Screens

**A. Home / Dashboard**
- Hero section: "Submit your water observation"
- Map showing recent observations (clustered by region)
- Quick stats: "Total observations: X", "Water detected in Y regions"
- Call-to-action button: "Start Observation"

**B. Observation Form**
- Location auto-detection (geolocation API)
- Manual location adjustment (drag on map)
- Camera capture UI (native camera app on mobile)
- Photo preview with compression info
- Optional: time window selector for satellite data lookup
- Submit button

**C. Results Page**
- Observation details (location, timestamp)
- Multi-panel layout:
  - **Panel 1:** Photo with overlay metadata
  - **Panel 2:** Analysis results (Gemini + satellite + weather)
    - Confidence gauge (visual: 0-100%)
    - Water presence verdict
    - Risk indicators (if any)
  - **Panel 3:** Map view
    - Location marker
    - Satellite NDWI overlay (heatmap if available)
    - Historical trend chart (last 30 days for this location)
  - **Panel 4:** Detailed breakdown
    - Gemini analysis text
    - Satellite data sources
    - Weather at time of observation
    - Comparison with historical baseline

**D. Explore / Map View**
- Interactive map (Leaflet)
- Clustering of observations by region
- Heatmap overlay of water presence probability
- Filters: date range, confidence threshold, water presence level
- Click observation to see details
- Trend analysis per region

**E. Methodology / About**
- Explanation of how the system works
- Limitations & disclaimers
- Data sources & accuracy notes
- FAQ

#### Key Technical Details

**Geolocation**
- Use browser Geolocation API
- Fallback to IP geolocation if denied
- Store user's timezone for proper time reference

**Camera Capture**
- Use native HTML5 `<input type="file" accept="image/*" capture="environment">`
- Compress image client-side (ImageCompression.js library)
- Target: max 2MB, 1920×1440 resolution
- Calculate hash (SHA256) for deduplication

**Authentication**
- Minimal: email + password (or Google/GitHub OAuth)
- Store JWT in localStorage (with httpOnly cookie backup)
- Refresh token rotation every 24 hours
- No user profiles required (anonymous observation possible)

**State Management**
- Zustand for global state (observationId, results, mapCenter, filters)
- React Query for server state (observations list, API calls)
- Local Storage for preferences (map style, theme)

**Map Integration**
- Leaflet.js for base map (OpenStreetMap tiles)
- Leaflet.heat plugin for heatmap layer
- Leaflet-GeoJSON for satellite overlay
- On-demand loading of GeoJSON clusters

**Progressive Enhancement**
- Works offline (service worker caches key assets)
- Stores pending observations in IndexedDB if offline
- Syncs when connection returns

---

### 3.2 Backend (Bun + ElysiaJS)

#### REST API Endpoints

**Authentication**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

**Observations**
```
POST   /api/v1/observations
GET    /api/v1/observations/:id
GET    /api/v1/observations (list with filters)
DELETE /api/v1/observations/:id (own observations only)
```

**Analysis Results**
```
GET    /api/v1/observations/:id/analysis
GET    /api/v1/observations/:id/satellite-data
GET    /api/v1/observations/:id/weather-data
```

**Explore/Analytics**
```
GET    /api/v1/map/heatmap (GeoJSON heatmap for region)
GET    /api/v1/map/clusters (clustered observations)
GET    /api/v1/regions/:region/stats (regional summary)
GET    /api/v1/regions/:region/trends (time-series data)
```

**System**
```
GET    /api/v1/health (system status)
GET    /api/v1/stats (global statistics)
```

#### Middleware & Services

**Request Pipeline**
```
Request
  ↓
CORS middleware
  ↓
Rate limiter (100 req/min per IP)
  ↓
Body parser (multipart for images)
  ↓
JWT validation (if needed)
  ↓
Request handler
  ↓
Error handler (centralized)
  ↓
Response formatter
```

**Image Storage**
- **Option A:** Upload to AWS S3 / DigitalOcean Spaces (better for scale)
- **Option B:** Local filesystem + CDN cache (simpler for hackathon)
- Serve via URL: `https://api.example.com/images/{hash}.jpg`

**Queue Manager (Bull/BullMQ)**
- **Job types:**
  - `analyze_photo` → Gemini Vision call
  - `fetch_satellite_data` → GEE query
  - `fetch_weather` → BMKG API
  - `compare_analysis` → Comparison logic
  - `aggregate_regional` → Regional stats (hourly batch job)

- **Execution model:**
  - Phase 3a-3c jobs run in parallel with dependencies
  - Timeout: 60 seconds per job (queue fails if timeout)
  - Retry: 2 attempts with exponential backoff
  - Dead-letter queue for persistent failures

**Caching Strategy**
- Redis expiration times:
  - Satellite data: 7 days (doesn't change frequently)
  - Weather data: 1 hour (can change)
  - Regional aggregates: 6 hours
  - Analysis results: never expire (historical)

---

### 3.3 AI Analysis (Gemini 2.0 Flash — Satellite Data Analyst)

**Peran BARU:** Gemini tidak lagi menganalisis foto. Ia menerima **seluruh data satelit** dari GEE (terstruktur dalam JSON) dan memberikan analisis komprehensif.

#### Prompt Engineering

**System Prompt (permanent):**
```
You are a hydrology and remote sensing analyst specialized in water presence 
detection in tropical environments. You receive multi-source satellite data 
for a specific location. Analyze ALL data sources comprehensively and respond 
in valid JSON with a natural language summary.
```

**Input Data (structured, dari GEE):**
```json
{
  "location": {
    "latitude": -7.25,
    "longitude": 112.75,
    "province": "Jawa Timur"
  },
  "satellite_data": {
    "sar": {
      "water_percentage": 34.2,
      "backscatter_mean": -18.5,
      "confidence": "high"
    },
    "ndwi": {
      "value": 0.42,
      "cloud_cover": 15,
      "available": true
    },
    "rainfall": {
      "total_7day_mm": 120,
      "trend": "increasing",
      "anomaly": null
    },
    "soil": {
      "type": "clay loam",
      "drainage": "moderate"
    },
    "elevation": {
      "meters": 45,
      "terrain": "flat"
    }
  },
  "observation": {
    "timestamp": "2026-05-23T10:30:00Z",
    "photo_url": "https://..."
  }
}
```

**Expected Response:**
```json
{
  "confidence": 78,
  "verdict": "probable",
  "reasoning": "SAR analysis shows 34.2% water coverage with strong backscatter signature, indicating surface water presence. NDWI (0.42) confirms open water. Recent rainfall (120mm/7d) supports wet conditions. Flat terrain with clay loam soil (moderate drainage) is consistent with water retention. All sources agree — high confidence in water presence assessment.",
  "contributing_factors": [
    "SAR water mask: 34% coverage — STRONG indicator",
    "NDWI: 0.42 — confirms open water",
    "Rainfall: 120mm in 7 days — supports wet conditions",
    "Terrain: flat, 45m elevation — allows water accumulation",
    "Soil: clay loam — moderate drainage"
  ],
  "anomalies": [],
  "recommendations": [
    "Site verification recommended for critical applications",
    "Monitor weekly for flood risk if rain continues"
  ]
}
```

#### Cost & Limits
- **Cost:** ~$0.001-0.003 per analysis (tergantung input size, 50k context)
- **Rate limit:** 50,000 requests/month free tier
- **Timeout:** 15 seconds per call
- **Fallback:** If Gemini fails, display raw satellite data with note "AI analysis unavailable"

---

### 3.4 Satellite Data Processing (Google Earth Engine API — Multi-Source)

#### A. Sentinel-1 SAR (Primary — Tembus Awan)

**Why SAR for Indonesia?**
- **Radar microwave** menembus awan (critical untuk Indonesia 70-90% cloudy)
- Air punya **backscatter rendah** (permukaan halus) → mudah dibedakan dari tanah
- Resolusi 10m, cukup untuk deteksi badan air sedang-besar

**How SAR Water Detection Works:**
```
Air (genangan):   backscatter < -20 dB (sinyal dipantulkan menjauh)
Tanah kering:     backscatter > -15 dB (sinyal dipantulkan kembali)
Vegetasi:         backscatter -10 to -5 dB
Urban:            backscatter > -5 dB (sangat terang)
```

**GEE Workflow (SAR):**
```
1. Query Sentinel-1 GRD for location ± 5km, date ± 7 days
2. Select VH polarization (better for water detection)
3. Apply speckle filter (Refined Lee)
4. Threshold backscatter < -20 dB → water mask
5. Calculate water percentage in area
6. Return: {waterPercentage, backscatterMean, confidence}
```

#### B. Sentinel-2 NDWI (Secondary — Jika Awan Rendah)

**What is NDWI?**
- Normalized Difference Water Index = (Green - NIR) / (Green + NIR)
- Sentinel-2 bands: Green = B3, NIR = B8
- Range: -1 (no water) to +1 (open water)
- Threshold: NDWI > 0.3 = water detected
- **Hanya digunakan jika cloud cover < 20%** (jarang di Indonesia)

#### C. CHIRPS Rainfall (Konteks)
- Data curah hujan 7 hari terakhir
- Untuk korelasi: apakah kondisi basah karena hujan atau sumber air permanen?
- Trend: increasing/decreasing/stable

#### D. OpenLandMap Soil Type
- Klasifikasi jenis tanah di lokasi observasi
- Konteks: tanah liat (drainase buruk → genangan), pasir (drainase cepat → kering)

#### E. SRTM Elevation
- Elevasi + slope
- Konteks: daerah rendah cenderung tergenang, lereng curam cenderung kering

**Full GEE Multi-Source Workflow:**
```
1. Query S1 SAR → water mask (PRIMARY, always available)
2. Query S2 NDWI → if cloud < 20% (SECONDARY)
3. Query CHIRPS → rainfall 7-day (CONTEXT)
4. Query OpenLandMap → soil type (CONTEXT)
5. Query SRTM     → elevation (CONTEXT)
6. Cache all results for 7 days
7. Return structured JSON → send to Gemini
```

**Challenges & Mitigations**
| Challenge | Reality | Solution |
|-----------|---------|----------|
| SAR false positives | Urban areas reflect like water | Filter with land cover data |
| SAR saturation | Very shallow water missed | Combine with NDWI when available |
| Cloud cover | 70-90% in Indonesia | SAR is primary (radar) |
| No S2 data | Common due to clouds | Skip NDWI, proceed with SAR only |

---

### 3.5 Rainfall Data (CHIRPS via GEE)

**Tidak pakai BMKG API** — tidak reliable. Ganti dengan CHIRPS yang sudah tersedia di GEE.

#### Data Retrieved
- Rainfall total 7 hari terakhir (mm)
- Trend: increasing / decreasing / stable
- Anomaly vs historical baseline (jika ada)

#### Implementation
```
CHIRPS sudah tersedia di GEE:
  ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')

Cukup filter by date + location, extract pixel values.
Cache 1 hari.
```

#### Usage in Analysis
- High rainfall (100mm+/7d) → explains wet conditions
- Low rainfall + SAR shows water → likely permanent water body
- Trend increasing → potential flood risk

---

### 3.6 Soil Type & Elevation Data (BIG API / OpenDEM)

#### Data Retrieved
- Soil type classification (from BIG soil map)
- Elevation (m, from DEM)
- Land cover type (forest, urban, agriculture, water)
- Slope (calculated from DEM)

#### Implementation
- Query GeoTIFF layers via BIG API
- Extract pixel value at observation location
- Cache for 30 days (rarely changes)
- Provide as context in analysis, not a primary feature

---

### 3.7 Analysis Pipeline (No Comparison Engine — Gemini as Analyst)

**Tidak ada weighted formula.** Semua data satelit dikirim ke Gemini, yang bertugas sebagai **analis AI** untuk menilai secara holistik.

#### Flow:
```
GEE Multi-Source → Structured JSON → Gemini → Final Assessment
```

#### What Gemini Receives:
```json
{
  "sar": {"waterPercentage": 34, "confidence": "high"},
  "ndwi": {"value": 0.42, "available": true},
  "rainfall": {"total7day_mm": 120, "trend": "increasing"},
  "soil": {"type": "clay loam", "drainage": "moderate"},
  "elevation": {"meters": 45, "terrain": "flat"}
}
```

#### What Gemini Produces:
- **confidence** (0-100): Based on strength of satellite evidence
- **verdict**: definitive / probable / possible / unlikely
- **reasoning**: Natural language explanation
- **recommendations**: Actionable next steps

#### Fallback (No Weighted Formula Needed):
| Scenario | Action |
|----------|--------|
| All satellite sources available | Full analysis by Gemini |
| SAR only (clouds blocked optical) | Gemini analyzes SAR + rainfall + soil + elevation |
| SAR + partial data | Gemini works with available data |
| Gemini fails | Display raw satellite data, mark "AI analysis unavailable" |

---

## 4. DATA FLOW: DETAILED WALKTHROUGH

### 4.1 Complete Request Lifecycle

```
USER SUBMITS OBSERVATION
├─ Location: {lat, lng}
├─ Photo: {visual reference}
├─ Timestamp: {ISO8601}
└─ Region: auto-detect province

    ↓ BACKEND RECEIVES

1. VALIDATE (< 2 sec)
   ├─ Check location valid
   ├─ Check photo < 5MB, JPEG/PNG
   └─ Reject if invalid

2. SAVE TO DB
   ├─ Insert observation doc with status: "processing"
   ├─ Upload photo to S3/storage
   ├─ Return observation_id to user
   └─ Start GEE processing

    ↓ GEE MULTI-SOURCE PIPELINE (15-30 sec)

STEP 1: SENTINEL-1 SAR (5-15 sec)
├─ Query GEE for location ± 5km
├─ Get recent S1 GRD imagery (< 7 days old)
├─ Apply speckle filter
├─ Threshold backscatter < -20dB → water mask
├─ Calculate water percentage
└─ Store in satellite_data.sar_analysis

STEP 2: SENTINEL-2 NDWI (5-15 sec, if cloud < 20%)
├─ Query GEE for location
├─ Check cloud cover
├─ If < 20%: calculate NDWI
├─ If > 20%: mark unavailable
└─ Store in satellite_data.ndwi

STEP 3: CHIRPS RAINFALL (3-5 sec)
├─ Query GEE for 7-day rainfall
├─ Calculate total + trend
└─ Store in satellite_data.chirps

STEP 4: SOIL + ELEVATION (3-5 sec)
├─ Query OpenLandMap for soil type
├─ Query SRTM for elevation
└─ Store in satellite_data.soil + elevation

    ↓ ALL SATELLITE DATA COLLECTED

SEND TO GEMINI 2.0 FLASH (3-8 sec)
├─ Format: structured JSON of ALL satellite data
├─ Send to Gemini with system prompt
├─ Gemini returns: confidence + verdict + reasoning + recommendations
└─ Store in gemini_analysis collection

UPDATE OBSERVATION STATUS
├─ Change status: "processing" → "completed"
└─ Notify frontend (polling)

USER SEES RESULTS
├─ Frontend polls /observations/{id}
├─ Receives: gemini analysis + satellite data
├─ Renders: 4-panel dashboard
└─ Updates: Indonesia choropleth map
```

### 4.2 Timing Breakdown

| Phase | Time | Parallelizable? |
|-------|------|---|
| Validate + save | 0.5 sec | - |
| **S1 SAR processing** | 5-15 sec | ✅ YES with other GEE |
| **S2 NDWI (if avail)** | 5-15 sec | ✅ YES |
| **CHIRPS rainfall** | 3-5 sec | ✅ YES |
| **Soil + Elevation** | 3-5 sec | ✅ YES |
| Gemini analysis | 3-8 sec | ⏳ After all GEE data |
| **Total (worst case)** | ~30 sec | |
| **Total (typical)** | ~15-20 sec | 🎯 |

**Dominant factor:** GEE query speed (tergantung server load). Sentinel-1 SAR biasanya 5-10 detik.

---

## 5. USER EXPERIENCE FLOW

### 5.1 Happy Path (All Systems Working)

```
USER
  ↓
[Opens app, clicks "Submit observation"]
  ↓
[App requests location → GPS enabled → {lat, lng} auto-filled]
  ↓
[User adjusts location on map (optional)]
  ↓
[User takes photo → camera opens → captures image]
  ↓
[Photo preview shown, file size displayed]
  ↓
[User clicks "Submit"]
  ↓
FRONTEND → API: POST /observations {lat, lng, photo}
  ↓
BACKEND: 200 OK {observation_id: "obs_12345"}
  ↓
[App shows "Processing... ⏳"]
[Frontend polls /observations/obs_12345/analysis every 2 sec]
  ↓
[After 10-15 sec, analysis completes]
  ↓
[Frontend receives analysis results]
  ↓
[App displays results page with all panels]
  ↓
USER SEES: "Water presence: MEDIUM (72% confidence) ⚠️"
```

### 5.2 Error Scenarios

**Gemini fails:**
- Status: "completed with partial data"
- Show: Satellite + weather data
- Note: "Photo analysis unavailable, satellite and weather data shown"

**Satellite data unavailable:**
- Status: "completed with partial data"
- Show: Gemini analysis + weather
- Note: "No recent satellite imagery (too cloudy or not yet available)"

**Both fail:**
- Status: "completed with warnings"
- Show: Weather data only
- Note: "Limited analysis available. Please try again later or visit in person."

**BMKG down:**
- Continue anyway
- Skip weather panel
- Mark as "weather data unavailable"

---

## 6. REGIONAL AGGREGATION & INSIGHTS

### 6.1 Peta Tematik Indonesia (Choropleth)

**Bukan heatmap biasa** — peta Indonesia dengan warna per provinsi berdasarkan water index dari satelit.

```
Update: Setiap 6 jam (batch job)
├─ Query GEE untuk setiap provinsi di Indonesia:
│  ├─ Sentinel-1 SAR water mask
│  ├─ Hitung water percentage per provinsi
│  └─ Assign water index (0-100)
├─ Simpan di collection regional_index
└─ Frontend: render GeoJSON choropleth

Warna:
  🟢 Hijau (75-100):  Sumber air melimpah
  🟡 Kuning (50-74):  Ketersediaan air sedang
  🟠 Oranye (25-49):  Rawan air
  🔴 Merah (0-24):    Kritis/kekeringan
```

### 6.2 Dashboard Displays

**Regional View:**
- Peta choropleth Indonesia dengan warna per provinsi
- Klik provinsi → lihat detail:
  - Water index saat ini + tren
  - Time-series chart (30 hari)
  - Observasi terkini di provinsi tersebut
  - Perbandingan dengan baseline historis

**Timeline Analysis:**
- Plot water index (%) over time per provinsi
- Overlay: rainfall data from CHIRPS
- Show correlation: rain → water presence

---

## 7. TECHNICAL STACK SUMMARY

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Maps:** Leaflet.js + GeoJSON choropleth Indonesia
- **State:** Zustand + React Query
- **Build:** Vite
- **Deployment:** Vercel

### Backend
- **Runtime:** Bun
- **Framework:** ElysiaJS
- **Database:** MongoDB Atlas (mongoose)
- **File Storage:** S3 / DigitalOcean Spaces
- **Deployment:** Railway

### AI & Satellite Services
- **AI Analyst:** Google Gemini 2.0 Flash (satellite data interpretation)
- **Satellite Platform:** Google Earth Engine (single API untuk semua data)
- **Radar Data:** Sentinel-1 SAR via GEE (tembus awan)
- **Optical Data:** Sentinel-2 via GEE (jika awan rendah)
- **Rainfall:** CHIRPS via GEE
- **Soil:** OpenLandMap via GEE
- **Elevation:** SRTM via GEE

### Python Worker
- **Framework:** FastAPI
- **Role:** GEE multi-source query orchestrator
- **Communication:** HTTP with Bun backend

### Databases
- **MongoDB Atlas:** Satu database untuk semua data (observations + satellite_data + gemini_analysis + regional_index)

### Monitoring & Logging
- **Error tracking:** Sentry
- **Logging:** Winston

---

## 8. LIMITATIONS & HONEST DISCLAIMERS

### What This System CANNOT Do
1. **Detect groundwater** — Only surface water visible to satellite
2. **Predict future** — Only current analysis, no forecasting
3. **Replace professional surveys** — Accuracy ~75-90%
4. **Work without internet** — Requires cloud APIs (GEE, Gemini)
5. **Distinguish water types** — Saltwater vs freshwater not determined
6. **Measure water depth** — Only presence/absence
7. **Detect very small water bodies** — SAR resolution 10m minimal

### Accuracy Factors
| Factor | Impact | Note |
|--------|--------|------|
| Urban areas | Medium | Buildings can cause SAR false positives |
| Dense vegetation | Medium | Forest canopy blocks SAR signal |
| Terrain complexity | Medium | Mountain shadows affect SAR |
| Water body size | Medium | < 10m water bodies may be missed |
| Temporal gap | Low | SAR available 1-3 days (vs 3-5 days for optical) |

### Best Used For
✅ **Rapid assessment** (disaster response, flood mapping)  
✅ **Regional monitoring** (peta Indonesia per provinsi)  
✅ **Trend monitoring** (getting wetter/drier?)  
✅ **Public engagement** (citizen science + satellite data)  

❌ **Regulatory decisions** (official water rights)  
❌ **Engineering design** (building reservoirs)  
❌ **Small-scale detection** (puddles, narrow streams)  

---

## 9. FUTURE ENHANCEMENTS (Post-MVP)

### Phase 2
- User accounts with profile + observation history
- Social features (share observations, follow regions)
- API for third-party integrations
- Mobile app (React Native / Flutter)

### Phase 3
- IoT sensor integration (optional physical sensors)
- ML model trained on ground truth (custom confidence model)
- Real-time alert system (anomaly detection)
- Integration with government agencies (data sharing)

### Phase 4
- Forecasting model (predict water presence 7 days ahead)
- Thermal imaging analysis (if users have thermal cameras)
- AR visualization (see water bodies on phone camera)
- Offline mode with local satellite caching

---

## 10. TESTING & VALIDATION STRATEGY

### MVP Testing Plan
1. **Manual testing:** 5-10 real observations in different environments
   - Urban area (buildings, asphalt)
   - Agricultural field (soil, crops)
   - Water body (lake, river)
   - Dry area (desert, concrete)
   - Wet area (swamp, flooded field)

2. **Compare with ground truth:**
   - Walk to each location
   - Manual observation: is there water or not?
   - Compare against system output
   - Calculate accuracy: TP, FP, FN, TN

3. **Accuracy metrics:**
   - Precision: TP / (TP + FP)
   - Recall: TP / (TP + FN)
   - F1 Score: 2 × (Precision × Recall) / (Precision + Recall)
   - Target: F1 ≥ 0.70 (reasonable for MVP)

4. **Load testing:**
   - Simulate 100 simultaneous observations
   - Monitor API response time, queue length, error rate
   - Ensure < 5% error rate

---

## 11. DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] Frontend: all pages tested on mobile (iOS/Android)
- [ ] Backend: all endpoints return proper error codes
- [ ] Database: indices created, backups configured
- [ ] APIs: rate limits set, error handling in place
- [ ] Security: JWT tokens refresh properly, CORS configured
- [ ] Environment: .env files configured for prod

### Launch Day
- [ ] Monitor Sentry for errors in real-time
- [ ] Check API logs for failures
- [ ] Monitor queue length (Bull dashboard)
- [ ] Test end-to-end with sample observation
- [ ] Have rollback plan ready (previous Docker image tagged)

### Post-Launch
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Fix critical bugs within 24 hours
- [ ] Document lessons learned

---

## 12. QUICK REFERENCE: Key URLs & Endpoints

| Component | URL | Role |
|-----------|-----|------|
| Frontend | `https://water-monitor.vercel.app` | User-facing app |
| Backend | `https://api.water-monitor.railway.app` | API server |
| MongoDB | `mongodb+srv://...` | Observations & analysis |
| PostgreSQL | `postgresql://...` | Time-series data |
| Redis | `redis://...` | Cache & queue |
| GEE | `https://earthengine.google.com` | Satellite processing |
| Gemini | `https://generativelanguage.googleapis.com` | Photo analysis |
| BMKG | `https://data.bmkg.go.id` | Weather data |

---

## CONCLUSION

This system balances **ambition** (satellite + AI + crowdsourcing) with **realism** (acknowledges limitations, transparent about accuracy).

**For competition:** Strong technical execution + novel integration = good score
**For production:** Needs validation, IoT sensors, regulatory approval

**Next step:** Start with Phase 1 (frontend form), get the happy path working, then layer in processing logic.

