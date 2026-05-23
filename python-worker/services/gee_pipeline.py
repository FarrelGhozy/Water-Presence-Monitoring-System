import ee


def analyze_location(lat: float, lng: float) -> dict:
    ee.Initialize()
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
        .filterDate(ee.Date.now().advance(-7, "day"), ee.Date.now())
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
        .filterDate(ee.Date.now().advance(-5, "day"), ee.Date.now())
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )

    if collection.size().getInfo() == 0:
        return {"value": None, "available": False, "cloudCover": None}

    image = collection.median()
    ndwi = image.normalizedDifference(["B3", "B8"])
    sample = ndwi.sample(point, 10).first()
    ndwi_val = sample.get("nd").getInfo() if sample else None
    cloud = collection.first().get("CLOUDY_PIXEL_PERCENTAGE").getInfo()

    return {
        "value": round(ndwi_val, 3) if ndwi_val else None,
        "available": ndwi_val is not None,
        "cloudCover": cloud,
    }


def _get_chirps_rainfall(point):
    collection = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterBounds(point)
        .filterDate(ee.Date.now().advance(-7, "day"), ee.Date.now())
    )

    total = collection.sum()
    sample = total.sample(point, 5000).first()
    rainfall = sample.get("precipitation").getInfo() if sample else None

    return {
        "rainfall7day_mm": round(rainfall, 1) if rainfall else 0,
        "trend": "increasing",
    }


def _get_soil_type(point):
    soil = (
        ee.Image("OpenLandMap/SOL/SOL_GRID")
        .sample(point, 250)
        .first()
    )
    return {"type": str(soil.get("b0").getInfo()) if soil else "unknown"}


def _get_elevation(point):
    dem = ee.Image("USGS/SRTMGL1_003")
    sample = dem.sample(point, 30).first()
    elev = sample.get("elevation").getInfo() if sample else None
    meters = round(elev, 1) if elev else 0

    terrain = "flat"
    if meters and meters >= 50:
        terrain = "hilly"
    if meters and meters >= 200:
        terrain = "mountainous"

    return {"meters": meters, "terrain": terrain}
