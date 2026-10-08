import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locality } from '../types';

interface MapContainerProps {
  localities: Locality[];
  selectedLocality: Locality | null;
  onSelectLocality: (locality: Locality) => void;
  onZoomReady: (zoom: () => void) => void;
}

export function MapContainer({
  localities,
  selectedLocality,
  onSelectLocality,
  onZoomReady,
}: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        scrollWheelZoom: false,
        zoomControl: true,
        minZoom: 6,
      }).setView([-33.3, -66.34], 7);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      onZoomReady(() => mapRef.current?.zoomIn());
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onZoomReady]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const localityLayer = L.featureGroup();
    markersRef.current.clear();
    const background = getPaletteColor('background');
    const secondary = getPaletteColor('secondary');

    localities.forEach(locality => {
      const [longitude, latitude] = locality.coordinates;
      const marker = L.circleMarker([latitude, longitude], {
        radius: 6,
        color: background,
        weight: 1.5,
        fillColor: secondary,
        fillOpacity: 0.92,
      });

      const popup = L.popup().setContent(
        `${locality.name} · ${locality.category} · ${locality.department}, ${locality.province}`,
      );

      marker.bindPopup(popup);
      marker.on('click', () => onSelectLocality(locality));
      marker.addTo(localityLayer);
      markersRef.current.set(locality.id, marker);
    });

    localityLayer.addTo(map);

    if (localities.length > 0) {
      map.fitBounds(localityLayer.getBounds(), { padding: [24, 24] });
    }

    return () => {
      map.removeLayer(localityLayer);
    };
  }, [localities, onSelectLocality]);

  useEffect(() => {
    if (!mapRef.current || !selectedLocality) return;

    const [longitude, latitude] = selectedLocality.coordinates;
    mapRef.current.setView([latitude, longitude], 12);

    const marker = markersRef.current.get(selectedLocality.id);
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLocality]);

  return (
    <div className="relative h-[min(62vh,720px)] min-h-[430px] overflow-hidden rounded border border-text/15 bg-secondary/10">
      <div
        id="map"
        className="h-full w-full"
        role="img"
        aria-label="Mapa interactivo de localidades"
      />
      <span className="absolute left-3 top-3 z-[400] flex items-center gap-1.5 rounded border border-background/90 bg-background/95 px-2 py-1.5 text-[10px] font-semibold text-secondary pointer-events-none">
        <MapPin className="h-3 w-3 text-secondary" />
        <span>Entre Sierras · {localities.length} sitios registrados</span>
      </span>
    </div>
  );
}

function getPaletteColor(color: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${color}`).trim();
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
