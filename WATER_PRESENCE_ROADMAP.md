# WATER PRESENCE MONITORING SYSTEM
## Development Roadmap & Competition Strategy

---

## EXECUTIVE SUMMARY

**Project Goal:** Build a citizen science water detection platform combining AI vision, satellite data, and crowdsourced observations.

**Timeline:** 3-4 weeks to MVP (for competition submission)

**Tech Stack:** React + Vite + Bun + ElysiaJS + MongoDB + GEE (SAR + NDWI + CHIRPS + Soil + DEM) + Gemini 2.0 Flash

**Target Users:** Disaster responders, water resource managers, environmental scientists, public

**Success Metrics:**
- ✅ Submit observation → GEE multi-source → Gemini analysis in 15-30 sec
- ✅ Confidence score 0-100% from AI analyst
- ✅ Peta Indonesia choropleth per provinsi (otomatis dari satelit)
- ✅ Accuracy F1 ≥ 0.80 on test dataset (SAR-based lebih akurat)
- ✅ No critical bugs on launch day

---

## TIMELINE: WEEK-BY-WEEK BREAKDOWN

### WEEK 1: GEE SETUP & MULTI-SOURCE PIPELINE

**Goal:** GEE multi-source satellite pipeline berfungsi (SAR + NDWI + CHIRPS + Soil + Elevation).

**Tasks:**

**Day 1: Register GEE & Setup**
- [ ] Daftar GEE (signup.earthengine.google.com) — approval 1-2 hari, lakukan HARI INI
- [ ] Pilih Community Tier (noncommercial) — deadline April 2026
- [ ] Setup service account GCP + GEE API key
- [ ] Create GitHub repo + monorepo structure
- [ ] Setup Bun + ElysiaJS + MongoDB

**Time estimate:** 4-5 jam

**Day 2: Python Worker + GEE Auth**
- [ ] Setup Python worker (FastAPI)
- [ ] GEE authentication (service account)
- [ ] Test: `ee.Initialize()` + basic query
- [ ] Create endpoint: POST /analyze → returns test data

**Time estimate:** 5-6 jam

**Day 3: Sentinel-1 SAR Integration**
- [ ] Implement `get_sar_water_mask()` — query S1 GRD
- [ ] Speckle filter + backscatter threshold
- [ ] Water percentage calculation
- [ ] Test: 5 lokasi di Indonesia

**Time estimate:** 6-8 jam

**Day 4: Add NDWI + CHIRPS + Soil + Elevation**
- [ ] Implement `get_ndwi_if_available()` — S2 NDWI
- [ ] Implement `get_chirps_rainfall()` — 7-day rainfall
- [ ] Implement `get_soil_type()` — OpenLandMap
- [ ] Implement `get_elevation()` — SRTM
- [ ] Full pipeline: all 5 sources in one call

**Time estimate:** 6-8 jam

**Day 5: Test & Caching**
- [ ] Test full multi-source pipeline → structured JSON output
- [ ] Implement caching (7-day TTL) untuk data satelit
- [ ] Error handling per source (graceful degradation)
- [ ] Document output format

**Time estimate:** 4-5 jam

**Week 1 Total: 25-32 jam**

**Deliverable:** Python worker yang bisa menerima (lat, lng) → return structured JSON dari 5 sumber data satelit.

---

### WEEK 2: GEMINI INTEGRATION + BACKEND/FRONTEND

**Goal:** Full pipeline: Submit → GEE → Gemini → Result.

**Tasks:**

**Day 1-2: Gemini AI Analyst Integration**
- [ ] Create `geminiService.ts` — kirim structured satellite data, bukan foto
- [ ] Design system prompt + data format
- [ ] Test: kirim sample satellite JSON → Gemini returns analysis
- [ ] Handle: parsing JSON response, error handling, retry logic

**Time estimate:** 6-8 jam

**Day 2-3: Backend — Full Pipeline**
- [ ] ElysiaJS endpoints: POST /observations, GET /observations/:id
- [ ] MongoDB models: Observation, SatelliteData, GeminiAnalysis
- [ ] Orchestration: submit → call Python worker → call Gemini → store
- [ ] Error handling: what if GEE fails? what if Gemini fails?

**Time estimate:** 6-8 jam

**Day 3-4: Frontend — Submit + Result Page**
- [ ] React + Vite + Tailwind setup
- [ ] Form Submit: GPS auto-detect + camera + submit button
- [ ] Result Page: confidence gauge + AI assessment text + breakdown satelit
- [ ] Polling setiap 3 detik untuk cek status

**Time estimate:** 6-8 jam

**Day 5: Frontend — Peta Choropleth Indonesia**
- [ ] Download GeoJSON batas administrasi Indonesia (provinsi)
- [ ] Leaflet choropleth: warna per provinsi dari data regional_index
- [ ] Marker observasi di peta
- [ ] Integrasi end-to-end: submit → result → peta update

**Time estimate:** 6-8 jam

**Week 2 Total: 24-32 jam**

**Deliverable:** Full working app: submit observasi → GEE multi-source → Gemini → hasil + peta.

---

---

### WEEK 3: POLISH, TESTING & PETA INDONESIA

**Goal:** Validasi akurasi, peta choropleth sempurna, siap demo.

**Tasks:**

**Day 1-2: Peta Choropleth Indonesia + Regional Index**
- [ ] Batch job: hitung water index per provinsi dari data SAR
- [ ] Store di collection `regional_index`
- [ ] Frontend: GeoJSON choropleth dengan warna gradien
- [ ] Interaktif: klik provinsi → lihat detail

**Time estimate:** 6-8 jam

**Day 2-3: Validation Testing**
- [ ] Test di 10+ lokasi:
  - Laut/sungai/danau → harus "DEFINITIVE"
  - Sawah tergenang → harus "PROBABLE"
  - Kota/gurun → harus "UNLIKELY"
  - Hutan → harus "POSSIBLE" (karena vegetasi)
- [ ] Bandingkan output sistem vs ground truth
- [ ] Hitung akurasi (precision, recall, F1)

**Time estimate:** 8-10 jam

**Day 4: Bug Fixes & Optimization**
- [ ] Fix: SAR false positive di area urban
- [ ] Caching: pastikan data satelit di-cache
- [ ] Error handling: graceful degradation
- [ ] UI polish: loading states, error messages

**Time estimate:** 6-8 jam

**Day 5: Deployment + Demo Prep**
- [ ] Deploy Python worker ke Railway
- [ ] Deploy backend ke Railway
- [ ] Deploy frontend ke Vercel
- [ ] Test end-to-end di production
- [ ] Siapkan demo + backup (screenshot + video)

**Time estimate:** 6-8 jam

**Week 3 Total: 26-34 jam**

**Deliverable:** Production-ready MVP dengan peta Indonesia choropleth, validated.

---

---

## TOTAL EFFORT ESTIMATE

| Week | Hours | Status |
|------|-------|--------|
| 1 | 25-32 | GEE Multi-Source Pipeline |
| 2 | 24-32 | Gemini + Backend + Frontend |
| 3 | 26-34 | Peta Indonesia + Testing |
| **TOTAL** | **75-98** | **~3 weeks FTE** |

**Interpretation:** Full-time developer can complete in 2.5-3 weeks. Lebih cepat dari estimasi awal karena arsitektur lebih sederhana (1 DB, no queue, no BMKG).

---

## PHASED ROLLOUT STRATEGY

### MVP (Week 1-3) - For Competition

**Must-Have:**
- ✅ GEE multi-source pipeline (SAR + NDWI + CHIRPS + Soil + Elevation)
- ✅ Gemini AI analyst (satellite data interpretation)
- ✅ Confidence scoring + natural language assessment
- ✅ Results page
- ✅ Peta choropleth Indonesia per provinsi
- ✅ Works on mobile

**Nice-to-Have:**
- ⚠️ Historical trend analysis (30-day charts)
- ⚠️ User accounts (anonymous OK for MVP)
- ⚠️ Detail panel per sumber satelit
- ⚠️ Offline mode

**Out of Scope:**
- ❌ Real-time alerts
- ❌ Mobile native app
- ❌ IoT sensor integration
- ❌ ML model training

### Phase 2 (Post-Competition) - Production Readiness

**If Winning / Getting Investment:**
- [ ] User accounts + auth
- [ ] Data validation + ground-truth collection
- [ ] ML model for custom confidence scoring
- [ ] Government agency integration
- [ ] Mobile app (React Native)

---

## COMPETITION PITCH STRATEGY

### Presentation (5 min)

**Structure:**

1. **Problem Statement (1 min)**
   - "Indonesia kesulitan monitoring sumber air — 70-90% awan, data lambat, mahal"
   - Solusi kami: Satelit radar (tembus awan) + AI analyst
   - Peta Indonesia real-time dari satelit

2. **Technical Solution (2 min)**
   - Tunjukkan peta Indonesia choropleth (LIVE)
   - Jelaskan 5 sumber satelit via GEE (SAR = tembus awan)
   - Gemini sebagai AI analyst (bukan photo analysis)
   - Demo: submit observasi → 20 detik → hasil

3. **Results & Validation (1 min)**
   - SAR water detection akurat walau mendung
   - Multi-source lebih reliable dari single source
   - Target F1 ≥ 0.80

4. **Impact & Scalability (1 min)**
   - Peta Indonesia otomatis update dari satelit
   - Disaster response, pertanian, lingkungan
   - Semua gratis (GEE + Gemini free tier)

### Demo Points

**Show:**
1. Buka app → lihat peta Indonesia choropleth (warna per provinsi)
2. Submit observasi (GPS + foto)
3. Loading... tunjukkan proses GEE multi-source
4. Hasil: confidence gauge + AI assessment + breakdown satelit
5. Peta update setelah observasi

**Have Ready:**
- Pre-recorded demo (backup if WiFi fails)
- Screenshot perbandingan: daerah basah vs kering di peta
- Architecture diagram (GEE 5 sumber → Gemini)
- Cost breakdown: GEE gratis, Gemini gratis (50k/bulan), semua Rp 0

### Judging Criteria (Likely)

| Criterion | Weight | How to Win |
|-----------|--------|-----------|
| **Innovation** | 25% | Multi-source satelit (SAR tembus awan) + AI analyst — unique! |
| **Technical Execution** | 25% | GEE multi-source pipeline + Gemini integration — advanced |
| **Practical Impact** | 20% | Peta Indonesia real-time, solusi untuk masalah tropis |
| **Presentation** | 15% | Demo peta choropleth Indonesia live — visual impact |
| **Team Capability** | 15% | Menguasai GEE, remote sensing, AI — impressive |

**Focus on:**
- Sentinel-1 SAR untuk Indonesia (tembus awan — critical differentiator!)
- Peta choropleth Indonesia yang terupdate otomatis
- AI sebagai analyst (bukan photo classifier) — lebih canggih
- Real-world validation (10+ test locations)

---

## RISK MITIGATION

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| GEE quota limit | Medium | High | Cache 7 hari, pilih Community Tier |
| SAR no data for location | Low | Medium | Skip SAR, proses dengan data lain |
| Sentinel-2 always cloudy | High | Low | SAR adalah PRIMARY (tembus awan) |
| Gemini timeout | Medium | Medium | Retry 1x, fallback: tampilkan data mentah |
| Gemini response format | Medium | Medium | Prompt engineering: "respond ONLY valid JSON" |

### Schedule Risks

| Risk | Mitigation |
|------|-----------|
| GEE approval delay | Daftar HARI INI, approval 1-2 hari |
| GEE learning curve | Gunakan Python client (lebih mudah dari JS) |
| SAR interpretation | Threshold sederhana (VH < -20dB), Gemini yang analisis |
| Gemini prompt not stable | Test prompt 5x dengan data berbeda sebelum fix |

---

## SUCCESS CRITERIA

### MVP Must-Have

- [ ] GEE multi-source pipeline berfungsi (5 sumber)
- [ ] Gemini analyst menghasilkan assessment yang masuk akal
- [ ] App deployed (frontend Vercel, backend + worker Railway)
- [ ] Observation submission → GEE → Gemini → result < 30 detik
- [ ] Peta choropleth Indonesia tampil di halaman utama
- [ ] Works on mobile
- [ ] No critical errors on demo day

### Validation

- [ ] Tested on 10+ real locations across Indonesia
- [ ] Accuracy documented (precision, recall, F1)
- [ ] Perbandingan: SAR vs NDWI vs ground truth
- [ ] Limitations clearly stated

### Presentation

- [ ] Demo: peta Indonesia choropleth (live!)
- [ ] Demo: submit observasi → hasil (live atau recorded)
- [ ] Architecture explained (GEE multi-source → Gemini)
- [ ] Why SAR for Indonesia? (tembus awan!)
- [ ] Question answers prepared

---

## POST-COMPETITION RETROSPECTIVE

**Questions to answer:**

1. What worked better than expected?
   - Expected: AI analysis accuracy
   - Reality: (will know after validation testing)

2. What was harder than expected?
   - Expected: GEE API complexity
   - Reality: (will know during development)

3. What would you do differently?
   - Expected: Start with simplified water detection (just satellite + photo, no weather)
   - Reality: (will know after MVP)

4. What's the business opportunity?
   - Expected: Water resource management companies, NGOs, government agencies
   - Reality: (will know from feedback)

---

## QUICK REFERENCE CHECKLIST

### Pre-Launch (Day Before Competition)

- [ ] Deploy to production (Vercel + Railway)
- [ ] Test end-to-end on mobile (iOS + Android)
- [ ] Prepare demo (both live and recorded backup)
- [ ] Print business cards / QR code to app
- [ ] Prepare slide deck (architecture, results, impact)
- [ ] Practice pitch (5 min, clear, confident)
- [ ] Have backup plans:
  - [ ] Pre-recorded demo (if WiFi fails)
  - [ ] Screenshots (if demo crashes)
  - [ ] Printed architecture diagram
- [ ] Get plenty of sleep 🛌

### Launch Day

- [ ] Arrive early, test WiFi
- [ ] Open app, verify working
- [ ] Have phone on airplane mode + hotspot backup
- [ ] Be ready for questions (know limitations!)
- [ ] Stay positive, confident
- [ ] Enjoy! This is a learning experience regardless of outcome

---

## CONCLUSION

This is an **ambitious but doable** project for a 3-4 week timeline. The key to success is:

1. **Start simple** (form + photo submission)
2. **Integrate one API at a time** (Gemini first, then GEE)
3. **Validate early** (real observations by end of week 2)
4. **Polish late** (bugs fixed, UI polished in week 4)
5. **Be honest about limitations** (confidence scores, not binary detection)

**You've got this.** Focus on execution, ask for help when stuck, and ship something real.

Good luck at the competition! 🚀

