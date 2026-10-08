import { useState } from 'react';
import { HeartPulse, RefreshCw, ArrowUpRight } from 'lucide-react';
import type { Service } from '../types';

interface NearbyServicesProps {
  services: Service[];
  loading: boolean;
  error: string | null;
  hospitalLookupAvailable: boolean;
  sources: Record<string, boolean>;
  onRetry: () => void;
}

export function NearbyServices({
  services,
  loading,
  error,
  hospitalLookupAvailable,
  sources,
  onRetry,
}: NearbyServicesProps) {
  const [filter, setFilter] = useState('all');

  const filteredServices =
    filter === 'all' ? services : services.filter(service => service.category === filter);
  const hospitals = services.filter(service => service.isHospital);
  const nearestHospital = hospitals[0];
  const distanceFormat = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section className="min-w-0" aria-labelledby="services-title">
      <div className="flex min-h-11 items-center justify-between gap-2.5 flex-wrap mb-3">
        <div>
          <span className="text-[9px] font-bold tracking-[1px] text-text/60">A TU ALREDEDOR</span>
          <h2 id="services-title" className="mt-0.5 font-display text-[23px] font-medium">
            Servicios cercanos
          </h2>
        </div>

        <label className="ml-auto text-text/70 text-xs" htmlFor="service-filter">
          Categoría
        </label>
        <select
          id="service-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-8 max-w-[150px] rounded border border-text/10 bg-background px-2 text-text text-xs"
          aria-label="Filtrar servicios cercanos"
        >
          <option value="all">Todos</option>
          <option value="health">Salud</option>
          <option value="shopping">Compras</option>
          <option value="education">Educación</option>
          <option value="safety">Emergencias</option>
          <option value="nature">Naturaleza</option>
          <option value="transport">Transporte</option>
          <option value="other">Otros</option>
        </select>

        {error && (
          <button
            className="grid h-8 w-8 flex-none place-items-center rounded border border-text/10 bg-background text-secondary"
            type="button"
            onClick={onRetry}
            aria-label="Volver a consultar servicios cercanos"
            title="Reintentar consulta"
          >
            <RefreshCw className="h-[15px] w-[15px]" />
          </button>
        )}
      </div>

      {nearestHospital && (
        <div className="mb-3 flex items-center gap-2.5 border-l-3 border-primary bg-primary/10 px-3 py-2.5">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-background text-primary">
            <HeartPulse className="h-4 w-4" />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <small className="text-[9px] font-bold text-primary">
              HOSPITAL MÁS CERCANO · HASTA 75 KM
            </small>
            <strong className="text-xs">{nearestHospital.name}</strong>
            <span className="text-[10px] text-text/70">
              {distanceFormat.format(nearestHospital.distanceKm)} km en línea recta
            </span>
          </span>
          <a
            href={nearestHospital.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto grid h-[30px] w-[30px] flex-none place-items-center text-primary"
            aria-label="Ver hospital en OpenStreetMap"
          >
            <ArrowUpRight className="h-[15px] w-[15px]" />
          </a>
        </div>
      )}

      <p className="min-h-[18px] mb-2.5 text-text/70 text-xs leading-[1.5]" role="status">
        {loading
          ? 'Buscando servicios cercanos en OpenStreetMap…'
          : error
            ? `No se pudieron cargar los servicios. ${error} Podés reintentar en unos segundos.`
            : `${services.length} servicios mapeados; comercios y equipamientos hasta 10 km, espacios naturales hasta 20 km${hospitalLookupAvailable ? ' y hospitales hasta 75 km' : '; búsqueda de hospitales temporalmente no disponible'}. ${getSourcesSummary(sources)}`}
      </p>

      <ul className="grid max-h-[370px] grid-cols-2 gap-x-[18px] overflow-y-auto m-0 p-0 list-none">
        {filteredServices.length === 0 ? (
          <li className="col-span-2 border-b border-text/10 px-1 py-3.5 text-text/70 text-xs leading-[1.6]">
            {filter === 'all'
              ? 'No se encontraron servicios mapeados en el área consultada. Puede haber lugares que todavía no estén en OpenStreetMap.'
              : 'No se encontraron elementos mapeados de esta categoría en el área consultada.'}
          </li>
        ) : (
          filteredServices.map(service => (
            <li key={service.id} className="grid min-w-0 gap-0.5 border-b border-text/10 px-1 py-2">
              <a
                href={service.url}
                target="_blank"
                rel="noreferrer"
                className="text-text text-xs font-semibold hover:text-accent hover:underline break-words"
              >
                {service.name}
              </a>
              <span className="text-text/70 text-[10px]">
                {service.label} · {distanceFormat.format(service.distanceKm)} km · {service.source}
              </span>
            </li>
          ))
        )}
      </ul>

      <p className="mt-3 text-text/70 text-[10px] leading-[1.6]">
        Salud: IGN/SISA · Escuelas: Mapa Educativo Nacional/IGN · Comercios y espacios públicos:
        OpenStreetMap. La cobertura puede ser incompleta.
      </p>
    </section>
  );
}

function getSourcesSummary(sources: Record<string, boolean>): string {
  const officialSources = [
    sources.ign_health ? 'IGN/SISA' : null,
    sources.ign_education ? 'Mapa Educativo Nacional' : null,
  ]
    .filter(Boolean)
    .join('; ');

  return officialSources ? `Fuentes oficiales: ${officialSources}.` : '';
}
