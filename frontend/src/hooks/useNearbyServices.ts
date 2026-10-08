import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import type { Locality, Service } from '../types';
import { calculateDistance } from '../utils/geo';

export function useNearbyServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitalLookupAvailable, setHospitalLookupAvailable] = useState(true);
  const [sources, setSources] = useState<Record<string, boolean>>({});
  const requestId = useRef(0);

  const loadServices = useCallback(async (locality: Locality) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    
    try {
      const [longitude, latitude] = locality.coordinates;
      const data = await apiService.getNearbyServices(latitude, longitude);
      
      const processedServices = processServices(locality, data.elements);
      if (requestId.current !== currentRequestId) return;
      setServices(processedServices);
      setHospitalLookupAvailable(data.hospital_lookup_available !== false);
      setSources(data.sources ?? {});
    } catch (err) {
      if (requestId.current === currentRequestId) setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      if (requestId.current === currentRequestId) setLoading(false);
    }
  }, []);

  const clearServices = useCallback(() => {
    requestId.current += 1;
    setServices([]);
    setLoading(false);
    setError(null);
    setHospitalLookupAvailable(true);
    setSources({});
  }, []);

  return { services, loading, error, hospitalLookupAvailable, sources, loadServices, clearServices };
}

function processServices(locality: Locality, elements: any[]): Service[] {
  const origin = { lat: locality.coordinates[1], lon: locality.coordinates[0] };
  const seen = new Set<string>();
  
  return elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const coordinates = getServiceCoordinates(element);
    const kind = classifyService(tags);
    
    if (!coordinates) return [];

    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    
    const distanceKm = calculateDistance(origin.lat, origin.lon, coordinates[0], coordinates[1]);
    const maxDistanceKm = isHospital(tags) ? 75 : kind.category === 'nature' ? 20 : 10;
    
    if (distanceKm > maxDistanceKm) return [];

    return [{
      id,
      name: tags.name ?? tags.brand ?? kind.label,
      category: kind.category,
      label: kind.label,
      distanceKm,
      coordinates,
      source: element.source ?? 'OpenStreetMap',
      url: element.url ?? `https://www.openstreetmap.org/${id}`,
      isHospital: isHospital(tags),
    }];
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}

function getServiceCoordinates(element: any): [number, number] | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [latitude, longitude];
}

function classifyService(tags: any): { category: string; label: string } {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;
  const healthcare = tags.healthcare;

  if (['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy', 'veterinary'].includes(amenity) ||
      ['hospital', 'clinic', 'doctors', 'doctor', 'dentist', 'pharmacy', 'veterinary', 'health_post', 'centre'].includes(healthcare) ||
      ['chemist', 'optician'].includes(shop)) {
    const labels: Record<string, string> = {
      hospital: 'Hospital',
      clinic: 'Clínica',
      doctors: 'Consultorio',
      doctor: 'Consultorio',
      dentist: 'Odontología',
      pharmacy: 'Farmacia',
      veterinary: 'Veterinaria',
      health_post: 'Puesto sanitario',
      centre: 'Centro de salud',
      chemist: 'Farmacia y perfumería',
      optician: 'Óptica',
    };
    return { category: 'health', label: labels[amenity] ?? labels[healthcare] ?? labels[shop] };
  }

  if (shop || amenity === 'marketplace') {
    const labels: Record<string, string> = {
      supermarket: 'Supermercado',
      convenience: 'Almacén',
      mall: 'Centro comercial',
      department_store: 'Tienda',
      marketplace: 'Mercado',
    };
    return { category: 'shopping', label: labels[shop] ?? (amenity === 'marketplace' ? labels.marketplace : 'Comercio') };
  }

  if (['school', 'kindergarten', 'college', 'university'].includes(amenity)) {
    return { category: 'education', label: 'Educación' };
  }

  if (['police', 'fire_station'].includes(amenity)) {
    return { category: 'safety', label: amenity === 'police' ? 'Policía' : 'Bomberos' };
  }

  if (['nature_reserve', 'park', 'garden'].includes(leisure) || tags.boundary === 'protected_area' || tags.protect_class) {
    return { category: 'nature', label: 'Naturaleza' };
  }

  if (['bus_station', 'ferry_terminal'].includes(amenity) || tags.public_transport === 'station' || tags.railway === 'station' || tags.highway === 'bus_stop') {
    return { category: 'transport', label: 'Transporte' };
  }

  const amenityLabels: Record<string, string> = {
    restaurant: 'Restaurante',
    cafe: 'Café',
    fast_food: 'Comida rápida',
    bar: 'Bar',
    fuel: 'Combustible',
    bank: 'Banco',
    post_office: 'Correo',
    library: 'Biblioteca',
  };
  if (amenityLabels[amenity]) return { category: 'other', label: amenityLabels[amenity] };

  return { category: 'other', label: 'Servicio' };
}

function isHospital(tags: any): boolean {
  return tags.amenity === 'hospital' || tags.healthcare === 'hospital';
}
