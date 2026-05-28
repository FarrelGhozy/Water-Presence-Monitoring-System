# 🌊 Water Presence Monitoring System

> **Citizen Science + AI + Multi-Source Satellite** — Pantau keberadaan air permukaan di Indonesia secara real-time menggunakan data satelit dan analisis AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![ElysiaJS](https://img.shields.io/badge/ElysiaJS-5A0EF8?style=for-the-badge&logo=elysia&logoColor=white)](https://elysiajs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Earth Engine](https://img.shields.io/badge/GEE-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://earthengine.google.com/)
[![Gemini](https://img.shields.io/badge/Gemini-8E75FF?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📋 Daftar Isi

- [Tentang](#-tentang)
- [Arsitektur](#-arsitektur)
- [Tech Stack](#-tech-stack)
- [Data Pipeline](#-data-pipeline)
- [5-Source GEE Pipeline](#-5-source-gee-pipeline)
- [Struktur Proyek](#-struktur-proyek)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Frontend](#-frontend)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Tim Pengembang](#-tim-pengembang)

---

## 🎯 Tentang

Indonesia memiliki **tutupan awan 70-90%** yang membuat deteksi air permukaan menggunakan citra satelit optik konvensional sangat sulit. Belum lagi minimalnya stasiun pemantauan air di lapangan.

**Water Presence Monitoring System** hadir sebagai solusi dengan pendekatan **satellite-first**:

- 🛰️ **Sentinel-1 SAR** — Radar gelombang mikro yang **tembus awan**, sebagai sumber primer deteksi air
- 🤖 **Gemini AI** — Bertindak sebagai **analis remote sensing** yang menilai semua data satelit secara holistik
- 🌍 **Multi-Source GEE** — 5 sumber data satelit dikombinasikan untuk akurasi maksimal
- 📱 **Citizen Science** — Masyarakat bisa berkontribusi dengan submit observasi GPS

### Use Case

| Area | Manfaat |
|------|---------|
| 🆘 **Disaster Response** | Pemetaan banjir cepat pasca-bencana |
| 🌾 **Agricultural Planning** | Penilaian irigasi dan kesuburan lahan |
| 💧 **Water Resource Survey** | Baseline survey daerah kering |
| 🌏 **Public Participation** | Proyek citizen science untuk kesadaran lingkungan |

---

## 🏗️ Arsitektur

```
                  ┌──────────────────────────────────────────┐
                  │          FRONTEND (React + Vite)          │
                  │  Map · Submit · Result · Choropleth       │
                  └──────────────┬───────────────────────────┘
                                 │  HTTPS REST API
                  ┌──────────────▼───────────────────────────┐
                  │      BACKEND (Bun + ElysiaJS)            │
                  │  REST API · Orchestrator · Gemini Client │
                  └──────┬──────────────┬────────────────────┘
                         │              │
          ┌──────────────▼──┐    ┌──────▼──────────────────────┐
          │    MongoDB 7    │    │    PYTHON WORKER (FastAPI)  │
          │  Observations   │    │    GEE Multi-Source Query   │
          │  Satellite Data │    │                              │
          │  Gemini Results │    │  ┌────────────────────────┐ │
          └─────────────────┘    │  │  Google Earth Engine   │ │
                                 │  │  ├─ Sentinel-1 SAR     │ │
                                 │  │  ├─ Sentinel-2 NDWI    │ │
                                 │  │  ├─ CHIRPS Rainfall    │ │
                                 │  │  ├─ OpenLandMap Soil   │ │
                                 │  │  └─ SRTM Elevation     │ │
                                 │  └────────────────────────┘ │
                                 └─────────────────────────────┘
                                            │
                               ┌────────────▼──────────────┐
                               │   GEMINI 2.0 FLASH (AI)   │
                               │   Satellite Data Analyst  │
                               │   → confidence            │
                               │   → verdict               │
                               │   → reasoning             │
                               │   → recommendations        │
                               └───────────────────────────┘
```

### Alur Data

```
User (GPS) → Backend → Python Worker → GEE (5 sumber) → Gemini AI → Hasil
                                                                   ↓
                                                              MongoDB
```

---

## 🛠️ Tech Stack

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | React 19 + Vite + TypeScript | UI user |
| **State / Data** | Zustand + React Query + React Router v7 | Manajemen state & polling |
| **Styling** | Tailwind CSS v4 | Styling utility-first |
| **Maps** | Leaflet + react-leaflet + GeoJSON | Peta interaktif & choropleth Indonesia |
| **Backend** | Bun + ElysiaJS | REST API server |
| **Database** | MongoDB 7 + Mongoose | Penyimpanan semua data |
| **AI Analyst** | Gemini 2.0 Flash | Analisis data satelit → confidence + verdict |
| **Satelit** | Google Earth Engine (Python API) | 5-source satellite pipeline |
| **Python Worker** | FastAPI + earthengine-api | GEE multi-source query |
| **Container** | Docker Compose | Development & production |

### 5 Sumber Data Satelit

| Sumber | Jenis | Tembus Awan | Prioritas | Fungsi |
|--------|-------|:-----------:|:---------:|--------|
| **Sentinel-1 SAR** | Radar C-band | ✅ Ya | **PRIMARY** | Water mask — deteksi air via backscatter |
| **Sentinel-2 NDWI** | Optical | ❌ Tidak | Secondary | Normalized Difference Water Index |
| **CHIRPS** | Rainfall | N/A | Konteks | Curah hujan 7 hari |
| **OpenLandMap** | Soil | N/A | Konteks | Klasifikasi jenis tanah |
| **SRTM** | Elevation | N/A | Konteks | Elevasi & kemiringan lahan |

> **Mengapa Sentinel-1 SAR sebagai primer?** Indonesia memiliki tutupan awan 70-90% sepanjang tahun. Radar SAR (C-band) menembus awan tanpa masalah, tidak seperti sensor optis (Sentinel-2).

---

## 🔄 Data Pipeline

### Flow Lengkap

```
1. User submit POST /api/v1/observations {lat, lng}
   ↓
2. Status: pending → processing
   ↓
3. Backend panggil Python Worker POST /analyze
   ↓
4. GEE Multi-Source Pipeline (5-20 detik, parallel):
   ├── Sentinel-1 SAR  → water mask, backscatter
   ├── Sentinel-2 NDWI → jika cloud < 20%
   ├── CHIRPS          → rainfall 7 hari + trend
   ├── OpenLandMap     → soil texture class
   └── SRTM            → elevation + terrain class
   ↓
5. Data satelit disimpan ke satellite_data
   ↓
6. Dikirim ke Gemini 2.0 Flash (3-8 detik)
   ↓
7. Gemini menghasilkan:
   ├── confidence (0-100)
   ├── verdict (definitive/probable/possible/unlikely)
   ├── reasoning (natural language)
   └── recommendations
   ↓
8. Hasil Gemini disimpan ke gemini_analysis
   ↓
9. Status: completed
   ↓
10. Frontend polling GET /api/v1/observations/:id
```

### Timing Breakdown

| Fase | Durasi | Paralel? |
|------|--------|:--------:|
| Validasi & save | < 1 detik | — |
| Sentinel-1 SAR | 5-15 detik | ✅ Ya |
| Sentinel-2 NDWI | 5-15 detik | ✅ Ya |
| CHIRPS Rainfall | 3-5 detik | ✅ Ya |
| Soil + Elevation | 3-5 detik | ✅ Ya |
| Gemini Analysis | 3-8 detik | Setelah GEE selesai |
| **Total** | **~15-30 detik** | 🎯 |

### Fallback & Error Handling

| Skenario | Aksi |
|----------|------|
| Semua data satelit tersedia | Full analysis oleh Gemini |
| Hanya SAR yang tersedia | Gemini analisis SAR + rainfall + soil + elevation |
| Gemini gagal | Tampilkan data satelit mentah, label "AI analysis unavailable" |
| GEE gagal total | Return error, rekomendasi manual survey |
| Timeout pipeline (5 menit) | Status → error |

---

## 📁 Struktur Proyek

```
water-presence-monitoring-system/
├── backend/                          # Bun + ElysiaJS
│   ├── src/
│   │   ├── index.ts                  # Entry point server
│   │   ├── config.ts                 # Env validation & konfigurasi
│   │   ├── api/
│   │   │   ├── index.ts              # Router aggregator
│   │   │   ├── health.ts             # GET /api/v1/health
│   │   │   ├── observations.ts       # CRUD observasi
│   │   │   ├── regions.ts            # GET /api/v1/regions
│   │   │   ├── map.ts                # Data peta
│   │   │   └── stats.ts              # Statistik
│   │   ├── services/
│   │   │   ├── pipeline.ts           # Orchestrator pipeline utama
│   │   │   ├── observation.ts        # Business logic observasi
│   │   │   └── region.ts             # Agregasi regional
│   │   ├── models/
│   │   │   ├── Observation.ts        # Mongoose schema observasi
│   │   │   ├── SatelliteData.ts      # Mongoose schema data satelit
│   │   │   └── GeminiAnalysis.ts     # Mongoose schema analisis AI
│   │   ├── external/
│   │   │   └── gemini.ts             # Gemini API client
│   │   ├── middleware/
│   │   │   └── error.ts              # Error handling
│   │   ├── utils/
│   │   │   ├── logger.ts             # Logger utility
│   │   │   └── fetch.ts              # Fetch dengan timeout
│   │   └── types/
│   │       └── index.ts              # Type definitions
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── python-worker/                    # FastAPI + GEE
│   ├── app.py                        # FastAPI server
│   ├── services/
│   │   └── gee_pipeline.py           # 5-source GEE pipeline + mock
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                         # React + Vite
│   ├── src/
│   │   ├── components/               # Komponen UI
│   │   ├── pages/                    # Halaman
│   │   ├── hooks/                    # Custom hooks
│   │   ├── services/                 # API client
│   │   ├── store/                    # Zustand store
│   │   ├── types/                    # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.dev.yml            # Development stack
├── docker-compose.prod.yml           # Production stack
├── MVP.md                            # Dokumen scope MVP
├── WATER_PRESENCE_SYSTEM_DESIGN.md   # Arsitektur lengkap
├── WATER_PRESENCE_ROADMAP.md         # Roadmap 3 minggu
├── WATER_PRESENCE_IMPLEMENTATION_GUIDE.md # Panduan implementasi
└── README.md                         # This file
```

---

## ⚡ Quick Start

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- [Docker](https://docker.com/) & Docker Compose
- [Python](https://python.org/) ≥ 3.10
- Akun [Google Earth Engine](https://earthengine.google.com/) (signup — approval 1-2 hari)
- API Key [Google Gemini](https://aistudio.google.com/)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/water-presence-monitoring-system.git
cd water-presence-monitoring-system

cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
BUN_ENV=development
MONGODB_URI=mongodb://localhost:27017/water-monitor-dev
GEMINI_API_KEY=your_gemini_api_key_here
GEE_WORKER_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=ganti-dengan-secret-aman
```

### 2. Docker Compose (Development)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

| Service | Port | Status |
|---------|:----:|:------:|
| MongoDB 7 | 27017 | ✅ |
| Python Worker (FastAPI) | 8000 | ✅ Hot reload |
| Backend (Bun + ElysiaJS) | 3000 | ✅ Hot reload |

### 3. Manual (tanpa Docker)

```bash
# Backend
cd backend
bun install
bun run dev

# Python Worker (terminal terpisah)
cd python-worker
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173` 🚀

### 5. Typecheck

```bash
cd backend && bunx tsc --noEmit
```

---

## 📖 API Documentation

Semua endpoint menggunakan prefix `/api/v1`.

### Observations

| Method | Path | Deskripsi | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/api/v1/observations` | Submit observasi | `{ latitude, longitude, photo? }` | `{ observation_id, status }` |
| `GET` | `/api/v1/observations` | List observasi | `?status=&province=&limit=&offset=` | `Observation[]` |
| `GET` | `/api/v1/observations/:id` | Detail observasi | — | Observation + SatelliteData + GeminiAnalysis |
| `DELETE` | `/api/v1/observations/:id` | Hapus observasi | — | `{ message }` |
| `GET` | `/api/v1/observations/:id/analysis` | Hasil analisis (polling) | — | GeminiAnalysis atau `{ status: "processing" }` |
| `GET` | `/api/v1/observations/:id/satellite-data` | Data satelit mentah | — | SatelliteData |

### Regions & Map

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/v1/regions` | Agregasi water index per provinsi |
| `GET` | `/api/v1/map/geojson` | GeoJSON batas provinsi Indonesia |
| `GET` | `/api/v1/map/observations` | Observasi untuk overlay peta |

### System

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/v1/health` | Health check server |
| `GET` | `/api/v1/stats` | Statistik global |

### Python Worker (Internal)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/analyze` | `{ lat, lng }` → 5-source GEE data |
| `GET` | `/health` | Health check worker |

---

## 💾 Database Schema

### `observations`
```typescript
{
  _id: ObjectId,
  latitude: number,
  longitude: number,
  province?: string,
  timestamp: Date,
  status: "pending" | "processing" | "completed" | "error",
  photoUrl?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### `satellite_data`
```typescript
{
  _id: ObjectId,
  observationId: ObjectId,
  sar: {
    waterPercentage: number | null,
    backscatterMean: number | null,
    confidence: "high" | "low" | "no_data"
  },
  ndwi: {
    value: number | null,
    available: boolean,
    cloudCover: number | null
  },
  chirps: {
    rainfall7day_mm: number,
    trend: "increasing" | "decreasing" | "stable" | "unknown"
  },
  soil: {
    type: string  // USDA soil texture class
  },
  elevation: {
    meters: number,
    terrain: "flat" | "hilly" | "mountainous"
  }
}
```

### `gemini_analysis`
```typescript
{
  _id: ObjectId,
  observationId: ObjectId,
  confidence: number,        // 0-100
  verdict: "definitive" | "probable" | "possible" | "unlikely",
  reasoning: string,         // Natural language explanation
  contributingFactors: string[],
  anomalies: string[],
  recommendations: string[],
  processedAt: Date,
  processingTimeMs: number
}
```

---

## 🎨 Frontend

### Pages

| Page | Route | Konten |
|------|-------|--------|
| **Home / Dashboard** | `/` | Hero + peta choropleth Indonesia + statistik |
| **Submit** | `/submit` | Peta interaktif + pilih lokasi + submit |
| **Result** | `/observation/:id` | AI Assessment + confidence gauge + breakdown satelit |
| **Map** | `/map` | Peta Indonesia choropleth + marker observasi |

### Tech

- **React 19** + **Vite 6** — Build tooling modern & cepat
- **Tailwind CSS v4** — Utility-first styling
- **Zustand** — Global state management
- **React Query** — Server state & polling (auto-polling tiap 2 detik)
- **React Router v7** — Routing
- **Leaflet** — Peta interaktif + choropleth GeoJSON Indonesia

---

## 🐳 Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production
```bash
# Set environment variables
export GEMINI_API_KEY=your_key
export EARTH_EARTH_PROJECT=your_project
export CORS_ORIGINS=https://water-presence.vercel.app

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Infrastructure Target

| Komponen | Platform |
|----------|----------|
| Frontend | Vercel / Netlify |
| Backend | Railway / Fly.io |
| Python Worker | Railway (sidecar) |
| Database | MongoDB Atlas |

---

## 🗺️ Roadmap

### ✅ Week 1 — Foundation & GEE Setup
- [x] Setup Bun + ElysiaJS + MongoDB
- [x] Python worker skeleton + GEE auth
- [x] Integrasi Sentinel-1 SAR (water mask)
- [x] Integrasi Sentinel-2 NDWI + CHIRPS + Soil + Elevation
- [x] Test GEE multi-source pipeline → output JSON

### ✅ Week 2 — AI + Backend Pipeline
- [x] Gemini integration — kirim data satelit → analysis
- [x] Backend: full flow (submit → GEE → Gemini → result)
- [x] Error handling + fallback analysis
- [x] Frontend: setup + routing dasar

### 🔄 Week 3 — Frontend + Polish
- [ ] Frontend: form submit + GPS (map picker)
- [ ] Frontend: result page (AI assessment + confidence gauge)
- [ ] Frontend: peta choropleth Indonesia (GeoJSON)
- [ ] Integrasi frontend-backend end-to-end
- [ ] UI polish, error handling, loading states
- [ ] Deploy + demo prep

### 📅 Post-MVP
- Historical trend analysis (30-day charts)
- User accounts + authentication
- Mobile app (React Native)
- Predictive modeling (forecast 7 hari)

---

## 🧪 Testing

Tidak ada test formal untuk MVP. Validasi dilakukan dengan:
- Manual testing 5-10 observasi di berbagai lokasi
- Perbandingan output sistem vs ground truth
- Target akurasi F1 ≥ 0.70 untuk MVP

---

## ⚠️ Limitasi

1. **Tidak mendeteksi air tanah** — hanya air permukaan yang terlihat satelit
2. **Tidak memprediksi masa depan** — analisis kondisi saat ini
3. **Tidak menggantikan survey profesional** — akurasi ~75-90%
4. **Membutuhkan koneksi internet** — bergantung pada cloud APIs
5. **Resolusi minimal 10m** — tidak bisa deteksi badan air sangat kecil
6. **Tidak membedakan jenis air** — asin vs tawar

---

## 👨‍💻 Tim Pengembang

**Berkah Ilahi UNIDA Gontor** — SFT 2026

Proyek ini dikembangkan untuk kompetisi **SFT 2026** dengan tema ketahanan air dan lingkungan di Indonesia.

---

## 📄 Lisensi

Hak cipta dilindungi. Proyek ini dikembangkan untuk keperluan kompetisi dan demonstrasi teknologi.

---

> 🌊 *"Dari satelit untuk Indonesia — memantau air permukaan untuk masa depan yang lebih baik."*
