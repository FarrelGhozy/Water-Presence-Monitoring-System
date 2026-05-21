# WATER PRESENCE MONITORING SYSTEM
## Comprehensive System Design Document

**Status:** Pre-Development Design  
**Last Updated:** May 2026  
**Project Type:** Hackathon / Competition Entry

---

## 1. SYSTEM OVERVIEW

### 1.1 Vision & Mission
Create a **citizen science + AI-powered platform** for real-time water presence monitoring via crowdsourced observations combined with satellite data validation.

**Key Insight:** Single photo + smartphone GPS is not enough to detect groundwater accurately. Instead, combine visual AI (Gemini), satellite surface water detection (Sentinel-2 NDWI), weather correlation (BMKG), and historical trends to build a *confidence indicator* rather than a binary detection.

### 1.2 Core Value Proposition
- **Accessible:** Works on any smartphone
- **Real-time:** Instant results (10-15 sec)
- **Validated:** Combines multiple data sources
- **Scalable:** Crowdsourced observations feed into regional analysis
- **Transparent:** Shows confidence scores & sources

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
│ - PWA-capable (offline support minimal)                │
└─────────────────────────────────────────────────────────┘
                        ↓
          (HTTPS REST with JWT auth)
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Backend (Railway / Heroku)                              │
│ - Bun runtime + ElysiaJS                               │
│ - REST API, WebSocket for live updates                 │
│ - Queue manager (Bull/BullMQ)                          │
│ - Session/JWT token manager                            │
└─────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌────────────┐    ┌────────────┐    ┌──────────────┐
    │ Data Layer │    │Processing  │    │External APIs │
    └────────────┘    │Microservices  └──────────────┘
         ↓            │
    ┌────────────┐    ↓
    │ MongoDB    │  ┌────────────────────┐
    │ (MongoDB   │  │ Python Worker      │
    │  Atlas)    │  │ (satellite processing)
    └────────────┘  └────────────────────┘
         ↓
    ┌────────────┐
    │PostgreSQL  │
    │(time-series│
    │+ spatial)  │
    └────────────┘
         ↓
    ┌────────────┐
    │ Redis      │
    │ (cache +   │
    │  queue)    │
    └────────────┘
```

### 2.2 Database Schema (High-Level)

#### MongoDB Collections
**observations** collection
```
{
  _id: ObjectId,
  userId: string,
  latitude: number,
  longitude: number,
  timestamp: Date,
  photoUrl: string,
  photoHash: string,
  status: "pending" | "processing" | "completed" | "error",
  createdAt: Date,
  updatedAt: Date
}
```

**analysis_results** collection
```
{
  _id: ObjectId,
  observationId: ObjectId,
  
  gemini_result: {
    soilType: string,
    waterPresence: "high" | "medium" | "low" | "none",
    waterPresenceConfidence: number (0-100),
    surfaceCondition: string,
    vegetation: string,
    details: string
  },
  
  satellite_data: {
    ndwiValue: number (-1 to 1),
    cloudCover: number (0-100),
    imageDate: Date,
    imageSource: "sentinel2" | "landsat",
    hasWaterFeature: boolean,
    waterArea_sqm: number (null if no water)
  },
  
  weather_data: {
    temperature: number,
    humidity: number,
    rainfall_24h: number (mm),
    source: "bmkg"
  },
  
  soil_data: {
    soilType: string (from BIG API),
    elevation: number (m),
    landCover: string
  },
  
  analysis: {
    confidence_score: number (0-100),
    water_presence_likelihood: "high" | "medium" | "low" | "none",
    risk_indicators: [string],
    anomalies: [string],
    recommendation: string
  },
  
  createdAt: Date,
  processedAt: Date,
  processingTime_ms: number
}
```

#### PostgreSQL Tables
**time_series_observations** table (for aggregation queries)
```
id (pk), 
observation_id (fk), 
latitude, 
longitude, 
date (indexed),
ndwi_value, 
confidence_score, 
water_presence (bool)
```

**spatial_index** table (for geographic queries)
```
id (pk),
observation_id (fk),
geom (PostGIS geometry),
region (string: province/district),
created_at (indexed)
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

### 3.3 AI/Vision Processing (Gemini Vision API)

#### Prompt Engineering

**System Prompt (permanent):**
```
You are an environmental analyst specializing in water and soil assessment.
Analyze the provided image and respond ONLY in valid JSON format with no markdown or preamble.
```

**User Prompt (per observation):**
```json
{
  "image": "<base64-encoded image>",
  "location": {
    "latitude": <number>,
    "longitude": <number>,
    "name": "<region name>"
  },
  "prompt": "Analyze this location for the following. Respond as JSON only:
  1. Estimated soil type (clay, sandy, loam, rocky, peat)
  2. Visible water presence (high, medium, low, none) with reasoning
  3. Confidence in assessment (0-100)
  4. Surface conditions (wet, damp, dry, flooded, standing water)
  5. Vegetation type and health
  6. Any visible anomalies or concerns
  7. Recommendations for next assessment"
}
```

**Expected Response:**
```json
{
  "soilType": "loamy clay",
  "waterPresence": "medium",
  "confidence": 72,
  "surface": "damp soil with standing puddles",
  "vegetation": "grass and reeds, healthy",
  "anomalies": ["muddy discharge visible, possibly from upstream"],
  "notes": "High water table indicated by vegetation type and surface conditions"
}
```

#### Cost & Limits
- **Cost:** ~$0.0008 per image (Gemini Vision pricing)
- **Rate limit:** 50,000 requests/month free tier (enough for hackathon)
- **Timeout:** 30 seconds per call
- **Fallback:** If API fails, mark analysis as "awaiting Gemini" and retry later

---

### 3.4 Satellite Data Processing (Google Earth Engine API)

#### NDWI Calculation

**What is NDWI?**
- Normalized Difference Water Index = (Green - NIR) / (Green + NIR)
- Sentinel-2 bands: Green = B3, NIR = B8
- Range: -1 (no water) to +1 (open water)
- Threshold: NDWI > 0.3 = water detected

**GEE Workflow (asynchronous)**

```
1. Query Sentinel-2 L2A for location ± 5km, date ± 3 days
2. Filter by cloud cover < 20%
3. Calculate NDWI for all available images
4. Apply threshold to create water mask
5. Calculate percentage of water pixels in area
6. Retrieve historical trend (last 30/90 days if available)
7. Cache result for 7 days
8. Return: {ndwiValue, waterArea, cloudCover, imageDate, hasWaterFeature}
```

**Implementation Notes**
- Use GEE JavaScript API or Python client
- Create a dedicated service account for authentication
- Batch requests to avoid quota limits
- Cache aggressively (satellite data changes slowly)

**Challenges & Mitigations**
| Challenge | Reality | Solution |
|-----------|---------|----------|
| Cloud cover | 30-50% of images | Filter + historical fallback |
| No image available | Rare but possible | Mark as "no recent satellite data" |
| Shadow confusion | Common in mountains | Use multiple spectral bands |
| Misidentified water | Urban reflections | Combine with MNDWI (more selective) |

---

### 3.5 Weather Data Integration (BMKG API)

#### Data Retrieved
- Temperature (°C)
- Humidity (%)
- Rainfall last 24 hours (mm)
- Wind speed (m/s)
- Weather condition (clear, cloudy, rainy, etc.)

#### Challenge: BMKG API Reliability
**Reality:** BMKG API documentation is poor, downtime is common, rate limits unclear.

**Solution:**
```
1. Fetch from BMKG primary endpoint
2. If timeout after 5 sec → fallback to OpenWeather (costs $$$)
3. Cache result for 1 hour
4. If all fail → return null, analysis proceeds without weather
```

#### Usage in Analysis
- High rainfall → increases water presence likelihood
- Low humidity + high temp → suggests dry conditions
- Recent rain → explains wet surface without groundwater

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

### 3.7 Comparison & Analysis Engine

#### Confidence Score Calculation

```
confidence = (w1 × gemini_conf) + (w2 × satellite_conf) + (w3 × coherence_penalty)

where:
  w1 = 0.4  (Gemini Vision weight)
  w2 = 0.4  (Satellite NDWI weight)
  w3 = 0.2  (Coherence/agreement weight)
  
  coherence_penalty = |gemini_water_likelihood - satellite_water_likelihood|
  → if both agree (both high or both low) → penalty = 0
  → if they disagree → penalty = up to -40 points
```

#### Water Presence Verdict

| Scenario | Verdict | Confidence | Risk |
|----------|---------|-----------|------|
| Gemini HIGH + NDWI HIGH + Recent rain | **High** | 85-100 | Surface water present, possible standing water |
| Gemini HIGH + NDWI LOW + No recent rain | **Medium** | 50-70 | Visual moisture but no satellite confirmation |
| Gemini LOW + NDWI HIGH + Clouds obscured | **Medium** | 60-75 | Satellite detected but needs validation |
| Gemini LOW + NDWI LOW + Dry weather | **Low** | 20-40 | No water detected, but limitations apply |
| All sources absent/failed | **Unknown** | 0-20 | Cannot assess, recommend manual survey |

#### Anomaly Detection

**Flags raised if:**
- Gemini and satellite strongly disagree (> 40 point difference)
- Cloud cover high (> 50%) on satellite → lower satellite confidence
- Unusual vegetation for soil type → possible misclassification
- Large rainfall but no water detected → possible drainage issue
- Temperature / humidity mismatch with expectations

---

## 4. DATA FLOW: DETAILED WALKTHROUGH

### 4.1 Complete Request Lifecycle

```
USER SUBMITS OBSERVATION
├─ Location: {lat, lng}
├─ Photo: {file, size}
├─ Timestamp: {ISO8601}
└─ Optional: {satellite_lookback_days: 7}

    ↓ BACKEND RECEIVES

1. VALIDATE (< 2 sec)
   ├─ Check location valid (within -90..90 lat, -180..180 lng)
   ├─ Check photo < 5MB, JPEG/PNG only
   ├─ Check user rate limit (max 10 observations/day)
   └─ Reject if invalid

2. SAVE TO DB
   ├─ Insert observation doc with status: "pending"
   ├─ Hash photo (SHA256), store as {hash}.jpg
   ├─ Upload photo to S3/storage
   ├─ Return observation_id to user (frontend shows success)
   └─ Start async processing

    ↓ QUEUE 3 PARALLEL JOBS (Bull)

JOB 1: PHOTO ANALYSIS (2-5 sec)
├─ Encode photo to base64
├─ Call Gemini Vision API
├─ Parse response JSON
└─ Store in analysis_results.gemini_result

JOB 2: SATELLITE DATA (5-30 sec)
├─ Query GEE for location + date
├─ Calculate NDWI
├─ Handle cloud cover
├─ Store in analysis_results.satellite_data

JOB 3: WEATHER & SOIL (2-3 sec)
├─ Fetch BMKG weather (parallel call)
├─ Fetch BIG soil/DEM data (parallel call)
├─ Store both in analysis_results

    ↓ WHEN ALL 3 JOBS COMPLETE

COMPARISON ENGINE
├─ Calculate confidence_score
├─ Determine water_presence_likelihood
├─ Detect anomalies
├─ Generate recommendations
└─ Store in analysis_results.analysis

UPDATE OBSERVATION STATUS
├─ Change status: "processing" → "completed"
├─ Set processedAt: now()
├─ If any job failed → status: "error", store error message
└─ Notify user via WebSocket or polling

USER SEES RESULTS
├─ Frontend polls /observations/{id}/analysis
├─ Receives full analysis object
├─ Renders all 4 panels
└─ Shows on map
```

### 4.2 Timing Breakdown

| Phase | Time | Parallelizable? |
|-------|------|---|
| Validate + save | 0.5 sec | - |
| Queue jobs | 0.1 sec | - |
| **Job 1:** Gemini Vision | 2-5 sec | ✅ YES |
| **Job 2:** Earth Engine | 5-30 sec | ✅ YES |
| **Job 3a:** BMKG weather | 2-3 sec | ✅ YES |
| **Job 3b:** BIG soil | 1-2 sec | ✅ YES |
| Comparison logic | 1-3 sec | ⏳ After 1,2,3 |
| **Total (sequential)** | ~45 sec | - |
| **Total (parallel)** | ~10-15 sec | 🎯 |

**Reality:** Most requests finish in 10-20 sec. Slow ones are due to GEE processing or satellite availability.

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

### 6.1 Hourly Batch Job

```
Every hour at :00 UTC
├─ Query all observations from last 7 days
├─ Group by region (province / district)
├─ Aggregate statistics:
│  ├─ Average confidence_score
│  ├─ % observations with high water presence
│  ├─ Trend (increasing/decreasing/stable)
│  ├─ Hotspots (locations with repeated high water)
│  └─ Recent alerts (observations with anomalies)
├─ Store in regional_summary table
└─ Update heatmap visualization
```

### 6.2 Dashboard Displays

**Regional View:**
- Map with color-coded regions
  - Green: Low water presence (< 20% of observations)
  - Yellow: Medium (20-60%)
  - Red: High (> 60%)
- Click region → see detail:
  - Time-series chart (last 30 days)
  - Recent observations list
  - Historical baseline vs current

**Timeline Analysis:**
- Plot water presence (%) over time for a region
- Overlay: rainfall data from BMKG
- Show correlation (rain → water presence spike)

---

## 7. TECHNICAL STACK SUMMARY

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Maps:** Leaflet.js + react-leaflet
- **State:** Zustand + React Query
- **Forms:** react-hook-form + Zod validation
- **Build:** Vite (5sec cold start)
- **Deployment:** Vercel (auto CI/CD from GitHub)

### Backend
- **Runtime:** Bun (~4x faster than Node.js)
- **Framework:** ElysiaJS (Elysia > Express for performance)
- **Database Drivers:**
  - MongoDB: mongoose
  - PostgreSQL: pg or prisma
- **Task Queue:** Bull (Redis-backed)
- **Caching:** Redis (ioredis)
- **File Storage:** S3 SDK (boto3 if Python worker)
- **Deployment:** Railway or Heroku (Docker support)

### AI & Data Services
- **Vision API:** Google Gemini Vision
- **Satellite:** Google Earth Engine API
- **Weather:** BMKG API + OpenWeather (fallback)
- **Soil/DEM:** BIG API + OpenDEM
- **Async Processing:** Python worker (Bun → Python via HTTP)

### Databases
- **MongoDB Atlas:** Flexible schema, easy scaling
- **PostgreSQL (Supabase):** Time-series + spatial queries
- **Redis (Upstash):** Cache + queue, free tier good for MVP

### Monitoring & Logging
- **Error tracking:** Sentry (free tier)
- **Logging:** Winston (structured logs)
- **Analytics:** Simple event logging to DB (minimal)

---

## 8. LIMITATIONS & HONEST DISCLAIMERS

### What This System CANNOT Do
1. **Detect groundwater** — Only surface water visible to satellites
2. **Predict future** — Only analyzes current moment, no forecasting
3. **Replace professional surveys** — Accuracy ~60-80%, not 99%
4. **Work without internet** — Requires cloud APIs
5. **Distinguish water types** — Saltwater vs freshwater not determined
6. **Measure water depth** — Only presence/absence
7. **Guarantee real-time accuracy** — Satellite data is 3-5 days old minimum

### Accuracy Factors
| Factor | Impact | Note |
|--------|--------|------|
| Cloud cover | High | 30-50% of images unusable |
| Time of day | Medium | Shadows affect Gemini analysis |
| Image quality | High | Blurry phone photos reduce accuracy |
| Terrain complexity | Medium | Mountains hide small water bodies |
| Vegetation type | Medium | Dense plants obscure ground truth |

### Best Used For
✅ **Rapid assessment** (disaster response, initial surveys)  
✅ **Trend monitoring** (is this region getting wetter/drier?)  
✅ **Public engagement** (crowdsourced environmental data)  

❌ **Regulatory decisions** (official water rights)  
❌ **Engineering design** (building reservoirs)  
❌ **Scientific papers** (needs rigorous validation)  

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

