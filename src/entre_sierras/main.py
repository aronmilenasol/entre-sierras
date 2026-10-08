from pathlib import Path
from urllib.error import URLError
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .services import get_nearby_services, get_locality_context

CURRENT_DIR = Path(__file__).parent
FRONTEND = CURRENT_DIR.parent.parent / "frontend" / "dist"
DATA = CURRENT_DIR / "static" / "data"
app = FastAPI(title="Entre Sierras")


@app.get("/api/nearby-services")
def nearby_services(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
):
    try:
        return get_nearby_services(lat, lon)
    except (RuntimeError, URLError, TimeoutError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/locality-context")
def locality_context(department_id: str = Query(pattern=r"^\d{5}$")):
    return get_locality_context(department_id)


@app.get("/data/{file_path:path}")
def serve_data(file_path: str):
    file_location = (DATA / file_path).resolve()
    try:
        file_location.relative_to(DATA.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    if file_location.is_file():
        return FileResponse(file_location)
    raise HTTPException(status_code=404, detail="File not found")

if FRONTEND.exists():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
