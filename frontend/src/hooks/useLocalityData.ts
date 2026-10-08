import { useState, useEffect } from 'react';
import type { Locality } from '../types';
import { calculateDistance } from '../utils/geo';
import { normalizeKey, normalizeText } from '../utils/text';

export function useLocalityData() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocalities() {
      try {
        const response = await fetch('/data/localities.geojson');
        if (!response.ok) throw new Error('No se pudo cargar el catálogo de localidades.');
        const data = await response.json();

        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          throw new Error('El archivo geográfico no tiene formato FeatureCollection.');
        }

        const processedLocalities: Locality[] = [];
        const merlo = data.features.find((feature: any) => {
          const name =
            typeof feature.properties?.name === 'string'
              ? normalizeText(feature.properties.name)
              : '';
          return name === 'merlo';
        });

        data.features.forEach((feature: any) => {
          const properties = feature.properties ?? {};
          const coordinates = feature.geometry?.coordinates;

          if (
            !['San Luis', 'Córdoba'].includes(properties.province) ||
            feature.geometry?.type !== 'Point' ||
            !Array.isArray(coordinates)
          )
            return;

          const [longitude, latitude] = coordinates;
          if (typeof properties.name !== 'string' || !properties.name.trim()) return;
          if (
            !Number.isFinite(longitude) ||
            !Number.isFinite(latitude) ||
            Math.abs(longitude) > 180 ||
            Math.abs(latitude) > 90
          )
            return;

          const locality: Locality = {
            id: String(properties.georef_id ?? normalizeKey(properties.name)),
            sourceId: String(
              properties.georef_source_id ?? properties.georef_id ?? normalizeKey(properties.name),
            ),
            departmentId: String(properties.department_id ?? properties.georef_id ?? '').slice(
              0,
              5,
            ),
            name: properties.name.trim(),
            category:
              typeof properties.category === 'string' ? properties.category : 'Asentamiento',
            department: typeof properties.department === 'string' ? properties.department : '',
            province: properties.province,
            municipality:
              typeof properties.municipality === 'string' ? properties.municipality : null,
            coordinates: [longitude, latitude],
            governmentPopulation: Number.isFinite(properties.government_population)
              ? properties.government_population
              : null,
            governmentPopulationYear: Number.isFinite(properties.government_population_year)
              ? properties.government_population_year
              : null,
            elevation: Number.isFinite(properties.elevation_m) ? properties.elevation_m : null,
            distanceToMerloKm: null,
          };

          if (merlo && locality.province === 'San Luis') {
            const merloCoords = merlo.geometry.coordinates;
            locality.distanceToMerloKm = calculateDistance(
              locality.coordinates[1],
              locality.coordinates[0],
              merloCoords[1],
              merloCoords[0],
            );
          }

          processedLocalities.push(locality);
        });

        if (processedLocalities.length === 0) {
          throw new Error('No se encontraron localidades en el archivo geográfico.');
        }

        setLocalities(processedLocalities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    loadLocalities();
  }, []);

  return { localities, loading, error };
}
