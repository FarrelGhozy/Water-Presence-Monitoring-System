import logging
import traceback
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from services.gee_pipeline import analyze_location

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Water Presence GEE Worker")

gee_available = True

try:
    import ee
    ee.Initialize()
except Exception as e:
    gee_available = False
    logger.warning("GEE not available, using mock data: %s", e)


class AnalyzeRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class AnalyzeResponse(BaseModel):
    sar: dict
    ndwi: dict
    chirps: dict
    soil: dict
    elevation: dict


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    try:
        result = analyze_location(req.lat, req.lng, gee_available)
        return result
    except Exception as e:
        logger.error("Analyze error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "gee_available": gee_available}
