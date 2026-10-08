import { Flame, Waves, ArrowUpRight } from 'lucide-react';
import type { LocalityContext } from '../types';

interface RiskPanelProps {
  context: LocalityContext | null;
  loading: boolean;
}

export function RiskPanel({ context, loading }: RiskPanelProps) {
  const historical = context?.historical_hydrometeorological;
  const regional = context?.regional_exposure;
  const numberFormat = new Intl.NumberFormat('es-AR');

  return (
    <section className="border-l border-text/10 pl-6" aria-labelledby="risk-title">
      <div className="flex min-h-11 items-center justify-between mb-3">
        <div>
          <span className="text-[9px] font-bold tracking-[1px] text-text/60">PREVENCIÓN</span>
          <h2 id="risk-title" className="mt-0.5 font-display text-[23px] font-medium">
            Riesgos y alertas
          </h2>
        </div>
      </div>

      <article className="flex gap-2.5 border-b border-text/10 py-3.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded bg-primary/10 text-primary">
          <Flame className="h-4 w-4" />
        </span>
        <div>
          <strong className="text-xs">Incendios</strong>
          <p className="m-1 mb-1.5 text-text/70 text-[10px] leading-[1.5]">
            Pronóstico meteorológico SMN (24, 48 y 72 h). Los focos satelitales son detecciones, no
            una estimación de peligro para una vivienda.
          </p>
          <a
            href="https://www.smn.gob.ar/indices_peligro_fuego"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-secondary text-xs font-semibold"
          >
            Índice de peligro SMN
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/map/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-secondary text-xs font-semibold"
          >
            Focos activos NASA FIRMS
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </article>

      <article className="flex gap-2.5 border-b border-text/10 py-3.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded bg-accent/10 text-accent">
          <Waves className="h-4 w-4" />
        </span>
        <div>
          <strong className="text-xs">Inundaciones</strong>
          <p className="m-1 mb-0 text-text/70 text-[10px] leading-[1.5]">
            {loading
              ? 'Consultando historial del departamento…'
              : historical
                ? `${historical.department}: ${Number.isFinite(historical.flood_records) ? numberFormat.format(historical.flood_records) : 'Sin dato'} registros históricos de inundación en DESINVENTAR.`
                : 'No hay registros departamentales disponibles en DESINVENTAR.'}
          </p>
          <small className="mb-1.5 -mt-0.5 block text-[9px] text-text/60">
            {historical?.source ?? 'IG-GIRD / IGN'}
          </small>
          <p className="m-1 mb-0 text-text/70 text-[10px] leading-[1.5]">
            {loading
              ? 'Consultando exposición regional…'
              : regional
                ? `${regional.region}: ${regional.classification}. Indicador regional SINAGIR, no una evaluación de la localidad.`
                : 'La capa de exposición regional SINAGIR no está disponible en este momento.'}
          </p>
          <small className="mb-1.5 -mt-0.5 block text-[9px] text-text/60">
            {regional?.source ?? 'IG-GIRD / IGN'}
          </small>
          <a
            href="https://riesgo.ign.gob.ar/mapa/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-secondary text-xs font-semibold"
          >
            Visor de riesgo IG-GIRD
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="https://open-meteo.com/en/docs/flood-api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-secondary text-xs font-semibold"
          >
            Caudal fluvial GloFAS
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </article>

      <p className="mt-3 text-text/70 text-[10px] leading-[1.6]">
        El historial de eventos y la exposición regional no equivalen a probabilidad actual de
        inundación en una parcela. GloFAS estima caudal en la celda fluvial más cercana (resolución
        aproximada 5 km); consultá fuentes oficiales antes de decidir.
      </p>
    </section>
  );
}
