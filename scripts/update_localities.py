import csv
import io
import json
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/entre_sierras/static/data/localities.geojson"
GEOREF_URL = "https://apis.datos.gob.ar/georef/api"
CENSUS_URL = "https://www.indec.gob.ar/ftp/cuadros/poblacion/c2022_tp_gobierno_local_c1.csv"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
ELEVATION_BATCH_SIZE = 100


def get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "EntreSierras/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").casefold().strip()


def parse_population(value: str) -> int | None:
    if not value or value.strip() in {".", "-"}:
        return None
    return int(value.replace(".", "").replace(",", ""))


def load_government_populations() -> dict[str, int]:
    request = Request(CENSUS_URL, headers={"User-Agent": "EntreSierras/1.0"})
    with urlopen(request, timeout=30) as response:
        content = response.read().decode("utf-8-sig")

    rows = csv.DictReader(io.StringIO(content), delimiter=";")
    return {
        row["CODGL"]: population
        for row in rows
        if row["CODGL"].startswith(("74", "14"))
        and (population := parse_population(row["Pob"])) is not None
    }


def load_elevations(localities: list[dict]) -> list[float | None]:
    elevations: list[float | None] = []
    for start in range(0, len(localities), ELEVATION_BATCH_SIZE):
        batch = localities[start : start + ELEVATION_BATCH_SIZE]
        coordinates = [feature["centroide"] for feature in batch]
        query = urlencode(
            {
                "latitude": ",".join(str(point["lat"]) for point in coordinates),
                "longitude": ",".join(str(point["lon"]) for point in coordinates),
            }
        )
        try:
            result = get_json(f"{ELEVATION_URL}?{query}").get("elevation", [])
            if len(result) != len(batch):
                raise ValueError("Open-Meteo returned an unexpected number of elevations.")
            elevations.extend(result)
        except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
            elevations.extend([None] * len(batch))
    return elevations


def build_feature(
    feature: dict,
    source_kind: str,
    government_populations: dict[str, int],
    elevation: float | None,
) -> dict:
    municipality = feature.get("municipio") or {}
    department = feature.get("departamento") or {}
    province = feature.get("provincia") or {}
    census_locality = feature.get("localidad_censal") or {}
    municipality_id = municipality.get("id")
    population = government_populations.get(municipality_id)
    center = feature["centroide"]
    population_source = "INDEC, Censo 2022 · gobierno local" if population is not None else None

    return {
        "type": "Feature",
        "properties": {
            "georef_id": f"{source_kind}:{feature['id']}",
            "georef_source_id": str(feature["id"]),
            "name": feature["nombre"],
            "category": feature.get("categoria") or "Asentamiento",
            "source_kind": source_kind,
            "department": department.get("nombre") or "",
            "department_id": department.get("id") or "",
            "municipality": municipality.get("nombre"),
            "municipality_id": municipality_id,
            "province": province.get("nombre") or "",
            "census_locality_id": census_locality.get("id"),
            "census_locality_name": census_locality.get("nombre"),
            "population": None,
            "population_year": None,
            "population_source": None,
            "government_population": population,
            "government_population_year": 2022 if population is not None else None,
            "government_population_source": population_source,
            "elevation_m": elevation,
            "elevation_source": "Open-Meteo Elevation API" if elevation is not None else None,
        },
        "geometry": {
            "type": "Point",
            "coordinates": [center["lon"], center["lat"]],
        },
    }


def locality_key(feature: dict) -> tuple[str, str]:
    return (
        normalize_name(feature["nombre"]),
        normalize_name((feature.get("departamento") or {}).get("nombre") or ""),
    )


def main() -> None:
    province_ids = ("14", "74")
    settlements = []
    census_localities = []
    for province_id in province_ids:
        parameters = urlencode({"provincia": province_id, "max": 5000})
        settlements.extend(get_json(f"{GEOREF_URL}/asentamientos?{parameters}").get("asentamientos", []))
        census_localities.extend(get_json(f"{GEOREF_URL}/localidades-censales?{parameters}").get("localidades_censales", []))
    settlements = [feature for feature in settlements if feature.get("provincia", {}).get("id") in province_ids and feature.get("centroide")]
    census_localities = [feature for feature in census_localities if feature.get("provincia", {}).get("id") in province_ids and feature.get("centroide")]
    if len(settlements) < 230:
        raise ValueError(f"Georef returned an unexpectedly small settlement catalog: {len(settlements)}.")

    combined = {f"asentamiento:{feature['id']}": (feature, "asentamiento") for feature in settlements}
    settlement_keys = {locality_key(feature) for feature in settlements}
    additional_census_localities = [
        feature for feature in census_localities if locality_key(feature) not in settlement_keys
    ]
    for feature in additional_census_localities:
        combined[f"localidad_censal:{feature['id']}"] = (feature, "localidad_censal")

    localities = list(combined.values())
    government_populations = load_government_populations()
    elevations = load_elevations([feature for feature, _ in localities])
    features = [
        build_feature(feature, source_kind, government_populations, elevation)
        for (feature, source_kind), elevation in zip(localities, elevations)
    ]
    features.sort(key=lambda item: (normalize_name(item["properties"]["name"]), item["properties"]["georef_id"]))

    OUTPUT.write_text(
        json.dumps(
            {"type": "FeatureCollection", "name": "entre_sierras_settlements", "features": features},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    categories = Counter(feature["properties"]["category"] for feature in features)
    population_count = sum(feature["properties"]["government_population"] is not None for feature in features)
    elevation_count = sum(feature["properties"]["elevation_m"] is not None for feature in features)
    print(f"Updated {len(features)} settlements; {population_count} have government-level population data.")
    print(f"Categories: {dict(sorted(categories.items()))}")
    print(f"Elevation available for {elevation_count} settlements.")
    print(f"GeoJSON: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
