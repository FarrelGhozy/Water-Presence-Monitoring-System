from datetime import datetime, timezone
import hashlib

import ee


def _seed_from_coords(lat: float, lng: float) -> int:
    h = hashlib.sha256(f"{lat:.4f},{lng:.4f}".encode()).hexdigest()
    return int(h[:8], 16)


def _mock_sar(seed: int) -> dict:
    wp = ((seed >> 0) & 0xFF) / 255 * 70 + 5
    bm = -((seed >> 8) & 0xFF) / 255 * 15 - 10
    return {"waterPercentage": round(wp, 1), "backscatterMean": round(bm, 2), "confidence": "high"}


def _mock_ndwi(seed: int) -> dict:
    val = ((seed >> 16) & 0xFF) / 255 * 0.6 - 0.2
    return {"value": round(val, 3), "available": True, "cloudCover": (seed >> 24) & 0x3F}


def _mock_chirps(seed: int) -> dict:
    mm = ((seed >> 4) & 0xFF) / 255 * 200
    trends = ["stable", "increasing", "decreasing", "stable"]
    return {"rainfall7day_mm": round(mm, 1), "trend": trends[(seed >> 12) & 0x3]}


def _mock_soil(seed: int) -> dict:
    types = ["clay", "loam", "sandy loam", "silt", "silty clay", "sand", "clay loam"]
    return {"type": types[(seed >> 20) & 0x7]}


def _mock_elevation(seed: int) -> dict:
    meters = ((seed >> 6) & 0xFF) / 255 * 300 + 2
    terrain = "flat"
    if meters >= 50:
        terrain = "hilly"
    if meters >= 200:
        terrain = "mountainous"
    return {"meters": round(meters, 1), "terrain": terrain}


def analyze_location(lat: float, lng: float, gee_available: bool = True) -> dict:
    if not gee_available:
        seed = _seed_from_coords(lat, lng)
        return {
            "sar": _mock_sar(seed),
            "ndwi": _mock_ndwi(seed),
            "chirps": _mock_chirps(seed),
            "soil": _mock_soil(seed),
            "elevation": _mock_elevation(seed),
        }

    point = ee.Geometry.Point([lng, lat])

    sar_result = _get_sar_water_mask(point)
    ndwi_result = _get_ndwi_if_available(point)
    chirps_result = _get_chirps_rainfall(point)
    soil_result = _get_soil_type(point)
    elevation_result = _get_elevation(point)

    return {
        "sar": sar_result,
        "ndwi": ndwi_result,
        "chirps": chirps_result,
        "soil": soil_result,
        "elevation": elevation_result,
    }


def _get_sar_water_mask(point):
    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(point)
        .filterDate(ee.Date(datetime.now(timezone.utc)).advance(-30, "day"), ee.Date(datetime.now(timezone.utc)))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select("VH")
    )

    if collection.size().getInfo() == 0:
        return {"waterPercentage": None, "backscatterMean": None, "confidence": "no_data"}

    image = collection.median()
    water_mask = image.lt(-20)
    water_pct = water_mask.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point.buffer(500), scale=10
    ).get("VH").getInfo()

    backscatter = image.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point.buffer(100), scale=10
    ).get("VH").getInfo()

    return {
        "waterPercentage": round(water_pct * 100, 1) if water_pct else 0,
        "backscatterMean": round(backscatter, 2) if backscatter else None,
        "confidence": "high" if water_pct is not None else "low",
    }


def _get_ndwi_if_available(point):
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate(ee.Date(datetime.now(timezone.utc)).advance(-30, "day"), ee.Date(datetime.now(timezone.utc)))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
    )

    if collection.size().getInfo() == 0:
        return {"value": None, "available": False, "cloudCover": None}

    image = collection.median()
    ndwi = image.normalizedDifference(["B3", "B8"])
    sample = ndwi.sample(point, 10, projection='EPSG:4326').first()
    ndwi_val = sample.get("nd").getInfo() if sample else None
    cloud = collection.first().get("CLOUDY_PIXEL_PERCENTAGE").getInfo()

    return {
        "value": round(ndwi_val, 3) if ndwi_val else None,
        "available": ndwi_val is not None,
        "cloudCover": cloud,
    }


def _get_chirps_rainfall(point):
    now = ee.Date(datetime.now(timezone.utc))

    current = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterBounds(point)
        .filterDate(now.advance(-7, "day"), now)
    )
    previous = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterBounds(point)
        .filterDate(now.advance(-14, "day"), now.advance(-7, "day"))
    )

    if current.size().getInfo() == 0:
        return {"rainfall7day_mm": 0, "trend": "unknown"}

    current_total = current.sum()
    previous_total = previous.sum()

    current_sample = current_total.sample(point, 5000, projection='EPSG:4326').first()
    previous_sample = previous_total.sample(point, 5000, projection='EPSG:4326').first()

    rainfall = current_sample.get("precipitation").getInfo() if current_sample else None
    prev_rainfall = previous_sample.get("precipitation").getInfo() if previous_sample else None

    trend = "unknown"
    if rainfall is not None and prev_rainfall is not None and prev_rainfall > 0:
        ratio = rainfall / prev_rainfall
        if ratio > 1.1:
            trend = "increasing"
        elif ratio < 0.9:
            trend = "decreasing"
        else:
            trend = "stable"

    return {
        "rainfall7day_mm": round(rainfall, 1) if rainfall else 0,
        "trend": trend,
    }


def _get_soil_type(point):
    USDA_CLASSES = {
        1: "clay", 2: "silty clay", 3: "silty clay loam", 4: "silt loam",
        5: "silt", 6: "loam", 7: "sandy clay", 8: "sandy clay loam",
        9: "sandy loam", 10: "loamy sand", 11: "sand", 12: "organic",
    }
    soil = (
        ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02")
        .sample(point, 250, projection='EPSG:4326')
        .first()
    )
    if soil:
        code = soil.get("b0").getInfo()
        if code is not None:
            return {"type": USDA_CLASSES.get(int(code), f"class_{code}")}
    return {"type": "unknown"}


def _get_elevation(point):
    dem = ee.Image("USGS/SRTMGL1_003")
    sample = dem.sample(point, 30, projection='EPSG:4326').first()
    elev = sample.get("elevation").getInfo() if sample else None
    meters = round(elev, 1) if elev else 0

    terrain = "flat"
    if meters and meters >= 50:
        terrain = "hilly"
    if meters and meters >= 200:
        terrain = "mountainous"

    return {"meters": meters, "terrain": terrain}
