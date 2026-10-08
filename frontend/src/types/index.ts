export interface Locality {
  id: string;
  sourceId: string;
  departmentId: string;
  name: string;
  category: string;
  department: string;
  province: string;
  municipality: string | null;
  coordinates: [number, number];
  governmentPopulation: number | null;
  governmentPopulationYear: number | null;
  elevation: number | null;
  distanceToMerloKm: number | null;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  label: string;
  distanceKm: number;
  coordinates: [number, number];
  source: string;
  url: string;
  isHospital: boolean;
}

export interface NearbyServicesResponse {
  elements: any[];
  hospital_lookup_available: boolean;
  sources: {
    openstreetmap: boolean;
    ign_health?: boolean;
    ign_education?: boolean;
  };
}

export interface LocalityContext {
  historical_hydrometeorological: {
    department: string;
    flood_records: number;
    all_hazard_records: number;
    classification: string;
    source: string;
  } | null;
  regional_exposure: {
    region: string;
    inundation_exposure: string;
    urban_flood_exposure: string;
    floodplain_exposure: string;
    classification: string;
    source: string;
  } | null;
}
