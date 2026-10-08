import json
import math
import threading
import time
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OVERPASS_ENDPOINTS = (
    ("https://overpass-api.de/api/interpreter", 18),
    ("https://overpass.kumi.systems/api/interpreter", 12),
)
IGN_WFS_URL = "https://wms.ign.gob.ar/geoserver/ows"
IGN_SERVICE_LAYERS = {
    "health": ("ign:salud_020801", "IGN/SISA"),
    "education": ("ign:puntos_de_ciencia_y_educacion_020601", "Mapa Educativo Nacional / IGN"),
}
IGN_DEPARTMENT_HISTORY_LAYER = "ign_riesgo:desinventar_hidrometeorologico_riesgo"
IGN_REGIONAL_EXPOSURE_LAYER = "ign_riesgo:sinagir_amenazas_hidrometeorologicas_riesgo"

SERVICE_CACHE_TTL = 6 * 60 * 60
CONTEXT_CACHE_TTL = 24 * 60 * 60

service_cache: dict[tuple[float, float], tuple[float, dict]] = {}
context_cache: dict[str, tuple[float, dict]] = {}
service_cache_lock = threading.Lock()

FETCH_ERRORS = (RuntimeError, URLError, TimeoutError, ValueError, json.JSONDecodeError)


def bounding_box(latitude: float, longitude: float, radius_km: float) -> tuple[float, float, float, float]:
    latitude_delta = radius_km / 111.32
    longitude_delta = radius_km / (111.32 * math.cos(math.radians(latitude)))
    return (
        latitude - latitude_delta,
        longitude - longitude_delta,
        latitude + latitude_delta,
        longitude + longitude_delta,
    )


def overpass_box(latitude: float, longitude: float, radius_km: float) -> str:
    south, west, north, east = bounding_box(latitude, longitude, radius_km)
    return f"{south},{west},{north},{east}"


def request_overpass(query: str) -> dict:
    body = urlencode({"data": query}).encode("utf-8")
    last_error: Exception | None = None

    for endpoint, timeout in OVERPASS_ENDPOINTS:
        request = Request(
            endpoint,
            data=body,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                "User-Agent": "EntreSierras/1.0 (nearby locality services)",
            },
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                data = json.load(response)
            if not isinstance(data.get("elements"), list) or data.get("remark"):
                raise ValueError("OpenStreetMap returned a partial response.")
            return data
        except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            last_error = error

    raise RuntimeError("OpenStreetMap did not respond in time. Please try again.") from last_error


def request_ign_layer(parameters: dict[str, str]) -> dict:
    url = f"{IGN_WFS_URL}?{urlencode(parameters)}"
    request = Request(url, headers={"User-Agent": "EntreSierras/1.0"})
    with urlopen(request, timeout=10) as response:
        data = json.load(response)
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("The IGN service returned an invalid feature collection.")
    return data


def get_official_facilities(latitude: float, longitude: float) -> tuple[list[dict], dict[str, bool]]:
    south, west, north, east = bounding_box(latitude, longitude, 10)
    bbox = f"{west},{south},{east},{north},CRS:84"
    facilities: list[dict] = []
    source_status = {"ign_health": False, "ign_education": False}

    for category, (layer, source) in IGN_SERVICE_LAYERS.items():
        try:
            response = request_ign_layer(
                {
                    "service": "WFS",
                    "version": "2.0.0",
                    "request": "GetFeature",
                    "typeNames": layer,
                    "outputFormat": "application/json",
                    "bbox": bbox,
                    "count": "500",
                }
            )
        except FETCH_ERRORS:
            continue

        source_status[f"ign_{category}"] = True
        for feature in response["features"]:
            geometry = feature.get("geometry")
            properties = feature.get("properties", {})
            if not isinstance(geometry, dict) or geometry.get("type") != "Point":
                continue
            coordinates = geometry.get("coordinates")
            if not isinstance(coordinates, list) or len(coordinates) < 2:
                continue
            # Nombres distintos a latitude/longitude para no pisar los parámetros
            feature_lon, feature_lat = coordinates[:2]
            if not math.isfinite(feature_lon) or not math.isfinite(feature_lat):
                continue

            general_name = properties.get("gna", "").casefold()
            amenity = "school" if category == "education" else "hospital" if "hospital" in general_name else "clinic"
            name = properties.get("fna") or properties.get("nam") or amenity.title()
            facilities.append(
                {
                    "type": "ign",
                    "id": f"{category}/{properties.get('gid', '')}",
                    "lat": feature_lat,
                    "lon": feature_lon,
                    "source": source,
                    "url": f"https://www.openstreetmap.org/#map=16/{feature_lat}/{feature_lon}",
                    "tags": {"name": name, "amenity": amenity},
                }
            )

    return facilities, source_status


def get_nearby_services(latitude: float, longitude: float) -> dict:
    cache_key = (round(latitude, 5), round(longitude, 5))
    now = time.monotonic()
    with service_cache_lock:
        cached = service_cache.get(cache_key)
        if cached and now - cached[0] < SERVICE_CACHE_TTL:
            return cached[1]

    box_10km = overpass_box(latitude, longitude, 10)
    box_20km = overpass_box(latitude, longitude, 20)
    query = (
        f'[out:json][timeout:15];('
        f'nwr({box_10km})["amenity"~"hospital|clinic|doctors|dentist|pharmacy|veterinary|health_post|nursing_home|school|kindergarten|college|university|police|fire_station|bus_station|marketplace|restaurant|cafe|fast_food|bar|fuel|bank|post_office|library"];'
        f'nwr({box_10km})["healthcare"];'
        f'nwr({box_10km})["shop"];'
        f'nwr({box_20km})["leisure"~"nature_reserve|park|garden"];'
        f'nwr({box_20km})["boundary"="protected_area"];'
        f'nwr({box_10km})["public_transport"="station"];'
        f'nwr({box_10km})["railway"="station"];'
        f'nwr({box_10km})["highway"="bus_stop"];'
        f');out center tags 1000;'
    )
    data = request_overpass(query)

    hospital_lookup_available = True
    try:
        box_75km = overpass_box(latitude, longitude, 75)
        hospital_query = f'[out:json][timeout:15];nwr({box_75km})["amenity"="hospital"];out center tags 500;'
        hospital_data = request_overpass(hospital_query)
        data["elements"].extend(hospital_data["elements"])
    except RuntimeError:
        hospital_lookup_available = False

    official_facilities, official_sources = get_official_facilities(latitude, longitude)
    data["elements"].extend(official_facilities)

    result = {
        "elements": data["elements"],
        "hospital_lookup_available": hospital_lookup_available,
        "sources": {"openstreetmap": True, **official_sources},
    }
    with service_cache_lock:
        service_cache[cache_key] = (time.monotonic(), result)
    return result


def get_regional_exposure() -> dict | None:
    cache_key = "regional_exposure_cuyo"
    now = time.monotonic()
    with service_cache_lock:
        cached = context_cache.get(cache_key)
        if cached and now - cached[0] < CONTEXT_CACHE_TTL:
            return cached[1]

    try:
        response = request_ign_layer(
            {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeNames": IGN_REGIONAL_EXPOSURE_LAYER,
                "outputFormat": "application/json",
                "CQL_FILTER": "region='Cuyo'",
                "count": "1",
            }
        )
        properties = response["features"][0]["properties"] if response["features"] else None
        if not properties:
            return None
        result = {
            "region": properties.get("region"),
            "inundation_exposure": properties.get("niveles_de_exposicion_inundaciones_sinagir"),
            "urban_flood_exposure": properties.get("niveles_de_exposicion_inundaciones_de_nucleos_urbanos_sinagir"),
            "floodplain_exposure": properties.get("niveles_de_exposicion_inundaciones_de_llanura_sinagir"),
            "classification": properties.get("categoria"),
            "source": "SINAGIR / IG-GIRD / IGN",
        }
    except (*FETCH_ERRORS, IndexError):
        return None

    with service_cache_lock:
        context_cache[cache_key] = (time.monotonic(), result)
    return result


def get_locality_context(department_id: str) -> dict:
    if len(department_id) != 5 or not department_id.isdigit():
        raise ValueError("A valid Georef department ID is required.")

    now = time.monotonic()
    with service_cache_lock:
        cached = context_cache.get(department_id)
        if cached and now - cached[0] < CONTEXT_CACHE_TTL:
            return cached[1]

    historical = None
    try:
        response = request_ign_layer(
            {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeNames": IGN_DEPARTMENT_HISTORY_LAYER,
                "outputFormat": "application/json",
                "CQL_FILTER": f"in1='{department_id}'",
                "count": "1",
            }
        )
        properties = response["features"][0]["properties"] if response["features"] else None
        if properties:
            historical = {
                "department": properties.get("nam"),
                "flood_records": properties.get("des_inun"),
                "all_hazard_records": properties.get("registros"),
                "classification": properties.get("categoria"),
                "source": "DESINVENTAR / IG-GIRD / IGN",
            }
    except (*FETCH_ERRORS, IndexError):
        pass

    result = {
        "historical_hydrometeorological": historical,
        "regional_exposure": get_regional_exposure(),
    }
    with service_cache_lock:
        context_cache[department_id] = (time.monotonic(), result)
    return result
