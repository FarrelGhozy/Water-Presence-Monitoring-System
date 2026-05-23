from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from services.gee_pipeline import analyze_location

app = FastAPI(title="Water Presence GEE Worker")


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
        result = analyze_location(req.lat, req.lng)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
