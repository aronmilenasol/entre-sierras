lucide.createIcons();

const defaultCenter = [-33.3, -66.34];
const map = L.map("map", { scrollWheelZoom: false, zoomControl: true, minZoom: 6 }).setView(defaultCenter, 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

const localityLayer = L.featureGroup().addTo(map);
const searchInput = document.querySelector("#locality-search");
const searchResults = document.querySelector("#search-results");
const localities = [];
const markers = new Map();
const numberFormat = new Intl.NumberFormat("es-AR");
const distanceFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const serviceCache = new Map();
const localityContextCache = new Map();
const serviceMapLayer = L.layerGroup().addTo(map);
const serviceFilter = document.querySelector("#service-filter");
const serviceList = document.querySelector("#service-list");
let selectedLocality = null;
let activeServiceController = null;
let activeServiceRequest = 0;
let activeContextController = null;
let activeContextRequest = 0;

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function localityKey(name) {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function classifyService(tags) {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;

  if (["hospital", "clinic", "doctors", "dentist", "pharmacy", "veterinary"].includes(amenity) || ["hospital", "clinic", "doctors", "dentist", "pharmacy", "veterinary"].includes(tags.healthcare)) {
    const labels = { hospital: "Hospital", clinic: "Clínica", doctors: "Consultorio", dentist: "Odontología", pharmacy: "Farmacia", veterinary: "Veterinaria" };
    return { category: "health", label: labels[amenity] ?? labels[tags.healthcare] };
  }
  if (["supermarket", "convenience", "mall", "department_store", "marketplace"].includes(shop) || amenity === "marketplace") {
    const labels = { supermarket: "Supermercado", convenience: "Almacén", mall: "Centro comercial", department_store: "Tienda", marketplace: "Mercado" };
    return { category: "shopping", label: labels[shop] ?? labels.marketplace };
  }
  if (["school", "kindergarten", "college", "university"].includes(amenity)) return { category: "education", label: "Educación" };
  if (["police", "fire_station"].includes(amenity)) return { category: "safety", label: amenity === "police" ? "Policía" : "Bomberos" };
  if (["nature_reserve", "park", "garden"].includes(leisure) || tags.boundary === "protected_area" || tags.protect_class) return { category: "nature", label: "Naturaleza" };
  if (["bus_station", "ferry_terminal"].includes(amenity) || tags.public_transport === "station" || tags.railway === "station" || tags.highway === "bus_stop") return { category: "transport", label: "Transporte" };
  return { category: "other", label: "Servicio" };
}

function serviceCoordinates(element) {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [latitude, longitude];
}

async function requestNearbyServices(locality, signal) {
  const [longitude, latitude] = locality.coordinates;
  const parameters = new URLSearchParams({ lat: latitude, lon: longitude });
  const response = await fetch(`/api/nearby-services?${parameters}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `El servidor respondió ${response.status}.`);
  if (!Array.isArray(data.elements)) throw new Error("La respuesta de OpenStreetMap no tiene elementos.");
  return data;
}

async function requestLocalityContext(locality, signal) {
  const parameters = new URLSearchParams({ department_id: locality.departmentId });
  const response = await fetch(`/api/locality-context?${parameters}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `El servidor respondió ${response.status}.`);
  return data;
}

function createNearbyServices(locality, elements) {
  const origin = L.latLng(locality.coordinates[1], locality.coordinates[0]);
  const seen = new Set();
  return elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const coordinates = serviceCoordinates(element);
    const kind = classifyService(tags);
    if (!coordinates) return [];

    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const distanceKm = origin.distanceTo(L.latLng(coordinates[0], coordinates[1])) / 1000;
    const maxDistanceKm = serviceIsHospital(tags) ? 50 : kind.category === "nature" ? 10 : 5;
    if (distanceKm > maxDistanceKm) return [];

    return [{
      id,
      name: tags.name ?? tags.brand ?? kind.label,
      category: kind.category,
      label: kind.label,
      distanceKm,
      coordinates,
      source: element.source ?? "OpenStreetMap",
      url: element.url ?? `https://www.openstreetmap.org/${id}`,
      isHospital: serviceIsHospital(tags),
    }];
  }).sort((first, second) => first.distanceKm - second.distanceKm);
}

function serviceIsHospital(tags) {
  return tags.amenity === "hospital" || tags.healthcare === "hospital";
}

function renderNearbyServices(services) {
  const category = serviceFilter.value;
  const visibleServices = category === "all" ? services : services.filter((service) => service.category === category);
  serviceList.replaceChildren();

  if (visibleServices.length === 0) {
    const empty = document.createElement("li");
    empty.className = "service-empty";
    empty.textContent = category === "all"
      ? "No se encontraron servicios mapeados en el área consultada. Puede haber lugares que todavía no estén en OpenStreetMap."
      : "No se encontraron elementos mapeados de esta categoría en el área consultada.";
    serviceList.append(empty);
    return;
  }

  visibleServices.forEach((service) => {
    const item = document.createElement("li");
    item.className = "service-item";
    const link = document.createElement("a");
    link.href = service.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = service.name;
    const detail = document.createElement("span");
    detail.textContent = `${service.label} · ${distanceFormat.format(service.distanceKm)} km · ${service.source}`;
    item.append(link, detail);
    serviceList.append(item);
  });
}

function showNearbyServices(locality, services, hospitalLookupAvailable = true, sources = {}) {
  const hospitals = services.filter((service) => service.isHospital);
  const nearestHospital = hospitals[0];
  const hospitalPanel = document.querySelector("#nearest-hospital");
  hospitalPanel.hidden = false;
  document.querySelector("#nearest-hospital-name").textContent = nearestHospital?.name
    ?? (hospitalLookupAvailable ? "No mapeado en OpenStreetMap" : "Consulta temporalmente no disponible");
  document.querySelector("#nearest-hospital-distance").textContent = nearestHospital
    ? `${distanceFormat.format(nearestHospital.distanceKm)} km en línea recta`
    : hospitalLookupAvailable ? "Sin centros mapeados hasta 50 km" : "No se pudo verificar hasta 50 km";
  document.querySelector("#nearest-hospital-link").href = nearestHospital ? nearestHospital.url : `https://www.openstreetmap.org/#map=13/${locality.coordinates[1]}/${locality.coordinates[0]}`;

  serviceMapLayer.clearLayers();
  services.forEach((service) => {
    const marker = L.circleMarker(service.coordinates, {
      radius: service.isHospital ? 7 : 5,
      color: "#ffffff",
      weight: 1.5,
      fillColor: service.isHospital ? "#bc6253" : "#3f7771",
      fillOpacity: 0.92,
    });
    const popup = document.createElement("span");
    popup.textContent = `${service.name} · ${service.label} · ${distanceFormat.format(service.distanceKm)} km · ${service.source}`;
    marker.bindPopup(popup).addTo(serviceMapLayer);
  });

  const officialSources = [
    sources.ign_health ? "IGN/SISA" : null,
    sources.ign_education ? "Mapa Educativo Nacional" : null,
  ].filter(Boolean).join("; ");
  const sourceSummary = officialSources ? ` Fuentes oficiales: ${officialSources}.` : "";
  document.querySelector("#service-status").textContent = `${services.length} servicios mapeados; servicios hasta 5 km, parques hasta 10 km${hospitalLookupAvailable ? " y hospitales hasta 50 km" : "; búsqueda de hospitales temporalmente no disponible"}.${sourceSummary}`;
  document.querySelector("#service-retry").hidden = true;
  renderNearbyServices(services);
}

function showLocalityContext(context) {
  const historical = context.historical_hydrometeorological;
  const regional = context.regional_exposure;
  const floodRecords = historical?.flood_records;

  document.querySelector("#department-risk-summary").textContent = historical
    ? `${historical.department}: ${Number.isFinite(floodRecords) ? numberFormat.format(floodRecords) : "Sin dato"} registros históricos de inundación en DESINVENTAR.`
    : "No hay registros departamentales disponibles en DESINVENTAR.";
  document.querySelector("#department-risk-source").textContent = historical?.source ?? "IG-GIRD / IGN";
  document.querySelector("#regional-risk-summary").textContent = regional
    ? `${regional.region}: ${regional.classification}. Indicador regional SINAGIR, no una evaluación de la localidad.`
    : "La capa de exposición regional SINAGIR no está disponible en este momento.";
  document.querySelector("#regional-risk-source").textContent = regional?.source ?? "IG-GIRD / IGN";
}

async function loadLocalityContext(locality) {
  activeContextController?.abort();
  const requestId = ++activeContextRequest;
  const cached = localityContextCache.get(locality.departmentId);
  if (cached) {
    showLocalityContext(cached);
    return;
  }

  const controller = new AbortController();
  activeContextController = controller;
  document.querySelector("#department-risk-summary").textContent = "Consultando historial del departamento…";
  document.querySelector("#regional-risk-summary").textContent = "Consultando exposición regional…";

  try {
    const context = await requestLocalityContext(locality, controller.signal);
    if (requestId !== activeContextRequest) return;
    localityContextCache.set(locality.departmentId, context);
    showLocalityContext(context);
  } catch (error) {
    if (controller.signal.aborted || requestId !== activeContextRequest) return;
    document.querySelector("#department-risk-summary").textContent = "No se pudo consultar el historial del departamento.";
    document.querySelector("#regional-risk-summary").textContent = "Consultá el visor oficial para ver las capas regionales disponibles.";
  }
}

async function loadNearbyServices(locality) {
  selectedLocality = locality;
  activeServiceController?.abort();
  activeServiceController = null;
  const requestId = ++activeServiceRequest;
  const cached = serviceCache.get(locality.id);
  if (cached) {
    showNearbyServices(locality, cached.services, cached.hospitalLookupAvailable, cached.sources);
    return;
  }

  const controller = new AbortController();
  activeServiceController = controller;
  document.querySelector("#service-status").textContent = "Buscando servicios cercanos en OpenStreetMap…";
  document.querySelector("#nearest-hospital").hidden = true;
  document.querySelector("#service-retry").hidden = true;
  serviceList.replaceChildren();
  serviceMapLayer.clearLayers();

  try {
    const data = await requestNearbyServices(locality, controller.signal);
    if (requestId !== activeServiceRequest) return;
    const services = createNearbyServices(locality, data.elements);
    const hospitalLookupAvailable = data.hospital_lookup_available !== false;
    const sources = data.sources ?? {};
    serviceCache.set(locality.id, { services, hospitalLookupAvailable, sources });
    showNearbyServices(locality, services, hospitalLookupAvailable, sources);
  } catch (error) {
    if (controller.signal.aborted || requestId !== activeServiceRequest) return;
    document.querySelector("#service-status").textContent = `No se pudieron cargar los servicios. ${error.message} Podés reintentar en unos segundos.`;
    document.querySelector("#nearest-hospital").hidden = true;
    document.querySelector("#service-retry").hidden = false;
  }
}

function renderSearchResults(matches) {
  searchResults.replaceChildren();
  searchResults.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");

  if (matches.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "search-empty";
    emptyMessage.textContent = "No hay localidades coincidentes en San Luis y Córdoba.";
    searchResults.append(emptyMessage);
    return;
  }

  matches.forEach((locality) => {
    const option = document.createElement("button");
    option.className = "search-result";
    option.type = "button";
    option.setAttribute("role", "option");
    option.textContent = `${locality.name} · ${locality.department}`;
    option.addEventListener("click", () => {
      selectLocality(locality, { zoom: true, popup: true });
      searchInput.value = "";
      closeSearchResults();
    });
    searchResults.append(option);
  });
}

function closeSearchResults() {
  searchResults.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
}

function selectLocality(locality, { zoom = false, popup = false } = {}) {
  const [longitude, latitude] = locality.coordinates;
  const key = locality.id;
  const population = locality.population;
  const elevation = locality.elevation;

  document.querySelector("#place-name").textContent = locality.name;
  document.querySelector("#place-department").textContent = locality.department.toLocaleUpperCase("es");
  document.querySelector("#place-coordinates").textContent = `${Math.abs(latitude).toFixed(5)}° S, ${Math.abs(longitude).toFixed(5)}° O`;
  document.querySelector("#place-population").textContent = population === null ? "No disponible" : numberFormat.format(population);
  document.querySelector("#population-source").textContent = population === null ? "Sin dato censal asociado a esta localidad" : `INDEC · Censo ${locality.populationYear}`;
  document.querySelector("#place-elevation").textContent = elevation === null ? "No disponible" : `${numberFormat.format(Math.round(elevation))} m`;
  document.querySelector("#elevation-source").textContent = elevation === null ? "Sin dato de elevación" : "Estimación del modelo en el centroide";
  document.querySelector("#place-distance").textContent = locality.distanceToMerloKm === null ? "No disponible" : `${distanceFormat.format(locality.distanceToMerloKm)} km`;
  document.querySelector("#datos").hidden = false;
  document.querySelector("#vida-local").hidden = false;
  document.querySelector("#map-status").textContent = `${locality.name} · ${locality.department}`;
  document.querySelector("#external-map-link").href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`;
  document.title = `${locality.name} | Entre Sierras`;
  window.history.replaceState(null, "", `?localidad=${encodeURIComponent(key)}`);

  const marker = markers.get(key);
  if (zoom) map.setView([latitude, longitude], 12);
  if (popup) marker?.openPopup();
  loadNearbyServices(locality);
  loadLocalityContext(locality);
}

function loadLocalities(data) {
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("El archivo geográfico no tiene formato FeatureCollection.");
  }

  data.features.forEach((feature) => {
    const properties = feature.properties ?? {};
    const coordinates = feature.geometry?.coordinates;
    if (!["San Luis", "Córdoba"].includes(properties.province) || feature.geometry?.type !== "Point" || !Array.isArray(coordinates)) return;

    const [longitude, latitude] = coordinates;
    if (typeof properties.name !== "string" || !properties.name.trim()) return;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return;

    const locality = {
      id: String(properties.georef_id ?? localityKey(properties.name)),
      departmentId: String(properties.department_id ?? properties.georef_id ?? "").slice(0, 5),
      name: properties.name.trim(),
      department: typeof properties.department === "string" ? properties.department : "",
      province: properties.province,
      coordinates: [longitude, latitude],
      population: Number.isFinite(properties.population) ? properties.population : null,
      populationYear: Number.isFinite(properties.population_year) ? properties.population_year : null,
      elevation: Number.isFinite(properties.elevation_m) ? properties.elevation_m : null,
    };
    const key = locality.id;
    if (markers.has(key)) return;

    const marker = L.circleMarker([latitude, longitude], {
      radius: 6,
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#315d49",
      fillOpacity: 0.92,
    });
    const popup = document.createElement("span");
    popup.textContent = `${locality.name} · ${locality.department}, ${locality.province}`;
    marker.bindPopup(popup).addTo(localityLayer);
    marker.on("click", () => selectLocality(locality));
    markers.set(key, marker);
    localities.push(locality);
  });

  if (localities.length === 0) {
    throw new Error("No se encontraron localidades de San Luis y Córdoba en el archivo geográfico.");
  }

  const merlo = localities.find((locality) => normalize(locality.name) === "merlo");
  localities.forEach((locality) => {
    locality.distanceToMerloKm = merlo && locality.province === "San Luis"
      ? L.latLng(locality.coordinates[1], locality.coordinates[0]).distanceTo(L.latLng(merlo.coordinates[1], merlo.coordinates[0])) / 1000
      : null;
  });

  document.querySelector("#locality-count").textContent = `${localities.length} localidades`;
  document.querySelector("#map-locality-count").textContent = localities.length;
  document.querySelector("#map-title").textContent = `${localities.length} localidades de San Luis y Córdoba`;

  const requestedKey = new URLSearchParams(window.location.search).get("localidad");
  const initialLocality = localities.find((locality) => locality.id === requestedKey)
    ?? localities.find((locality) => localityKey(locality.name) === requestedKey);
  if (initialLocality) selectLocality(initialLocality, { zoom: true });
  else map.fitBounds(localityLayer.getBounds(), { padding: [24, 24] });
  document.querySelector("#source-status").textContent = "Localidades: Georef · Población: INDEC, Censo 2022 · Elevación: Open-Meteo.";
}

fetch("/data/localities.geojson")
  .then((response) => {
    if (!response.ok) throw new Error("No se pudo cargar el catálogo de localidades.");
    return response.json();
  })
  .then(loadLocalities)
  .catch((error) => {
    document.querySelector("#source-status").textContent = `No se pudo cargar el catálogo provincial: ${error.message}`;
  });

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
  });
});

searchInput.addEventListener("input", () => {
  const query = normalize(searchInput.value.trim());
  if (!query) {
    closeSearchResults();
    return;
  }

  const matches = localities.filter((locality) => normalize(`${locality.name} ${locality.department}`).includes(query));
  renderSearchResults(matches);
});

serviceFilter.addEventListener("change", () => {
  if (selectedLocality && serviceCache.has(selectedLocality.id)) renderNearbyServices(serviceCache.get(selectedLocality.id).services);
});

document.querySelector("#service-retry").addEventListener("click", () => {
  if (selectedLocality) loadNearbyServices(selectedLocality);
});

searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim()) searchInput.dispatchEvent(new Event("input"));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-box")) closeSearchResults();
});

document.querySelector("#share-button").addEventListener("click", async (event) => {
  const button = event.currentTarget;

  try {
    await navigator.clipboard.writeText(window.location.href);
    button.title = "Enlace copiado";
  } catch {
    button.title = "Copiá el enlace desde la barra del navegador";
  }
});

document.querySelector("#map-expand").addEventListener("click", () => {
  map.setZoom(map.getZoom() + 2);
});

window.addEventListener("resize", () => map.invalidateSize());