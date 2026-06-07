# Water Presence Monitoring System

> **Citizen Science + AI + Multi-Source Satellite** — Pantau keberadaan air permukaan di Indonesia secara real-time menggunakan data satelit dan analisis AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![ElysiaJS](https://img.shields.io/badge/ElysiaJS-5A0EF8?style=for-the-badge&logo=elysia&logoColor=white)](https://elysiajs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-FF6B35?style=for-the-badge&logo=openrouter&logoColor=white)](https://openrouter.ai/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## Daftar Isi

- [Tentang](#tentang)
- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Data Pipeline](#data-pipeline)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Struktur Proyek](#struktur-proyek)
- [Lisensi](#lisensi)

---

## Tentang

Indonesia memiliki **tutupan awan 70-90%** yang membuat deteksi air permukaan menggunakan citra satelit optik konvensional sangat sulit. **Water Presence Monitoring System** hadir dengan pendekatan **satellite-first**:

- **Sentinel-1 SAR** — Radar gelombang mikro yang **tembus awan**, sebagai sumber primer deteksi air
- **OpenRouter AI** — Analisis multi-model via satu API, menggunakan **owl-alpha** (gratis, 1M context)
- **Multi-Source** — 5 sumber data satelit dikombinasikan untuk akurasi maksimal
- **Citizen Science** — Masyarakat bisa berkontribusi dengan submit observasi GPS

### Use Case

| Area | Manfaat |
|------|---------|
| **Disaster Response** | Pemetaan banjir cepat pasca-bencana |
| **Agricultural Planning** | Penilaian irigasi dan kesuburan lahan |
| **Water Resource Survey** | Baseline survey daerah kering |
| **Public Participation** | Proyek citizen science untuk kesadaran lingkungan |

---

## Arsitektur

```
                  +------------------------------------------+
                  |          FRONTEND (React + Vite)          |
                  |  Map . Submit . Result . Choropleth       |
                  +--------------+---------------------------+
                                 |  HTTPS REST API
                  +--------------v---------------------------+
                  |      BACKEND (Bun + ElysiaJS)            |
                  |  REST API . Orchestrator . AI Client     |
                  +------+--------------+--------------------+
                         |              |
          +--------------v--+    +------v----------------------+
          |    MongoDB 7    |    |    PYTHON WORKER (FastAPI)  |
          |  Observations   |    |    Satellite Data Pipeline  |
          |  Satellite Data |    |                              |
          |  AI Results     |    |  +------------------------+ |
          +-----------------+    |  | (Mock Mode jika GEE    | |
                                 |  |  tidak tersedia)       | |
                                 |  +------------------------+ |
                                 +-----------------------------+
                                            |
                               +-----------v---------------+
                               |   OPENROUTER AI (API)     |
                               |   Model: owl-alpha        |
                               |   -> confidence           |
                               |   -> verdict              |
                               |   -> reasoning            |
                               |   -> recommendations      |
                               +---------------------------+
```

### Alur Data

```
User (GPS) -> Backend -> Python Worker -> GEE (5 sumber, atau mock) -> OpenRouter AI -> Hasil
                                                                                       |
                                                                                  MongoDB
```

---

## Tech Stack

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | React 19 + Vite + TypeScript | UI user |
| **State / Data** | Zustand + React Query + React Router | Manajemen state & polling |
| **Styling** | Tailwind CSS v4 | Styling utility-first |
| **Maps** | Leaflet + react-leaflet + GeoJSON | Peta interaktif & choropleth Indonesia |
| **Backend** | Bun + ElysiaJS | REST API server |
| **Database** | MongoDB 7 + Mongoose | Penyimpanan semua data |
| **AI Analyst** | OpenRouter (owl-alpha) | Analisis data satelit -> confidence + verdict |
| **Satelit** | Google Earth Engine (opsional, fallback mock) | 5-source satellite pipeline |
| **Python Worker** | FastAPI | Multi-source query & fallback mock |
| **Container** | Docker Compose | Development & production |

### 5 Sumber Data Satelit

| Sumber | Jenis | Tembus Awan | Prioritas | Fungsi |
|--------|-------|:-----------:|:---------:|--------|
| **Sentinel-1 SAR** | Radar C-band | Ya | **PRIMARY** | Water mask -- deteksi air via backscatter |
| **Sentinel-2 NDWI** | Optical | Tidak | Secondary | Normalized Difference Water Index |
| **CHIRPS** | Rainfall | N/A | Konteks | Curah hujan 7 hari |
| **OpenLandMap** | Soil | N/A | Konteks | Klasifikasi jenis tanah |
| **SRTM** | Elevation | N/A | Konteks | Elevasi & kemiringan lahan |

> **Mengapa Sentinel-1 SAR sebagai primer?** Indonesia memiliki tutupan awan 70-90% sepanjang tahun. Radar SAR (C-band) menembus awan tanpa masalah, tidak seperti sensor optis (Sentinel-2).

---

## Data Pipeline

### Flow Lengkap

```
1. User submit POST /api/v1/observations {lat, lng}
   v
2. Status: pending -> processing
   v
3. Backend panggil Python Worker POST /analyze
   v
4. Data Pipeline (5-20 detik):
   +-- Sentinel-1 SAR  -> water mask, backscatter
   +-- Sentinel-2 NDWI -> jika cloud < 20%
   +-- CHIRPS          -> rainfall 7 hari + trend
   +-- OpenLandMap     -> soil texture class
   +-- SRTM            -> elevation + terrain class
   v
5. Data satelit disimpan ke satellite_data
   v
6. Dikirim ke OpenRouter AI (owl-alpha)
   v
7. AI menghasilkan:
   +-- confidence (0-100)
   +-- verdict (definitive/probable/possible/unlikely)
   +-- reasoning (natural language)
   +-- recommendations
   v
8. Hasil AI disimpan ke ai_analysis
   v
9. Status: completed
   v
10. Frontend polling GET /api/v1/observations/:id
```

### Timing Breakdown

| Fase | Durasi | Paralel? |
|------|--------|:--------:|
| Validasi & save | < 1 detik | -- |
| GEE Pipeline (5 sumber) | 5-15 detik | Ya |
| OpenRouter AI | 3-8 detik | Setelah GEE selesai |
| **Total** | **~15-25 detik** |  |

### Fallback

| Skenario | Aksi |
|----------|------|
| GEE tidak tersedia | Mock data otomatis |
| OpenRouter gagal | Rule-based analysis (berdasarkan data satelit) |
| Timeout pipeline (5 menit) | Status -> error |

---

## Quick Start

### Prerequisites

- [Docker](https://docker.com/) & Docker Compose
- Akun [OpenRouter](https://openrouter.ai/) (gratis, dapat $1 credit)
- (Opsional) Akun [Google Earth Engine](https://earthengine.google.com/) untuk data satelit real

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
OPENROUTER_API_KEY=sk-or-v1-...   # Dapatkan di https://openrouter.ai/settings/keys
AI_MODEL=openrouter/owl-alpha
GEE_WORKER_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:5173
```

> **Cara dapat OpenRouter API Key:** Buka https://openrouter.ai/settings/keys -> Create API Key -> copy (mulai dengan `sk-or-v1-...`). Model `owl-alpha` gratis.

### 2. Docker Compose (Development)

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

| Service | Port | Status |
|---------|:----:|:------:|
| MongoDB 7 | 27017 | |
| Python Worker (FastAPI) | 8000 | Hot reload |
| Backend (Bun + ElysiaJS) | 3000 | Hot reload |

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

Buka `http://localhost:5173`

### 5. Typecheck

```bash
cd backend && bunx tsc --noEmit
```

---

## API Documentation

Semua endpoint menggunakan prefix `/api/v1`.

### Observations

| Method | Path | Deskripsi | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/api/v1/observations` | Submit observasi | `{ latitude, longitude }` | `{ observation_id, status }` |
| `GET` | `/api/v1/observations` | List observasi | `?status=&province=&limit=&offset=` | `Observation[]` |
| `GET` | `/api/v1/observations/:id` | Detail observasi | -- | Observation + SatelliteData + AIAnalysis |
| `DELETE` | `/api/v1/observations/:id` | Hapus observasi | -- | `{ message }` |
| `GET` | `/api/v1/observations/:id/analysis` | Hasil analisis (polling) | -- | AIAnalysis atau `{ status: "processing" }` |
| `GET` | `/api/v1/observations/:id/satellite-data` | Data satelit mentah | -- | SatelliteData |

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
| `POST` | `/analyze` | `{ lat, lng }` -> 5-source satellite data |
| `GET` | `/health` | Health check worker |

---

## Struktur Proyek

```
water-presence-monitoring-system/
+-- backend/                          # Bun + ElysiaJS
|   +-- src/
|   |   +-- index.ts                  # Entry point server
|   |   +-- config.ts                 # Env validation & konfigurasi
|   |   +-- api/
|   |   |   +-- index.ts              # Router aggregator
|   |   |   +-- health.ts
|   |   |   +-- observations.ts
|   |   |   +-- regions.ts
|   |   |   +-- map.ts
|   |   |   +-- stats.ts
|   |   +-- services/
|   |   |   +-- pipeline.ts           # Orchestrator pipeline utama
|   |   |   +-- observation.ts
|   |   |   +-- region.ts
|   |   |   +-- map.ts
|   |   |   +-- stats.ts
|   |   +-- models/
|   |   |   +-- Observation.ts
|   |   |   +-- SatelliteData.ts
|   |   |   +-- GeminiAnalysis.ts
|   |   |   +-- RegionalIndex.ts
|   |   +-- external/
|   |   |   +-- openrouter.ts         # OpenRouter AI client
|   |   +-- middleware/
|   |   |   +-- error.ts
|   |   +-- utils/
|   |   |   +-- fetch.ts
|   |   |   +-- logger.ts
|   |   |   +-- storage.ts
|   |   +-- types/
|   |       +-- index.ts
|   |       +-- observation.ts
|   |       +-- satellite.ts
|   +-- package.json
|   +-- Dockerfile
|   +-- .env.example
|
+-- python-worker/                    # FastAPI
|   +-- app.py
|   +-- services/
|   |   +-- gee_pipeline.py           # Pipeline satelit + mock fallback
|   +-- requirements.txt
|   +-- Dockerfile
|
+-- frontend/                         # React + Vite
|   +-- src/
|   |   +-- components/
|   |   |   +-- layout/
|   |   |   +-- map/
|   |   |   +-- ui/
|   |   +-- pages/
|   |   +-- hooks/
|   |   +-- services/
|   |   +-- store/
|   |   +-- types/
|   +-- package.json
|   +-- vite.config.ts
|
+-- docker-compose.dev.yml
+-- docker-compose.prod.yml
+-- CLAUDE.md                          # Konteks proyek untuk AI assistant
+-- README.md
```

---

## Lisensi

Hak cipta dilindungi. Proyek ini dikembangkan untuk keperluan kompetisi dan demonstrasi teknologi.

---

> *"Dari satelit untuk Indonesia -- memantau air permukaan untuk masa depan yang lebih baik."*
