import type { Locality } from '../types';

interface LocalityPanelProps {
  locality: Locality | null;
}

export function LocalityPanel({ locality }: LocalityPanelProps) {
  if (!locality) return null;

  const numberFormat = new Intl.NumberFormat('es-AR');
  const [longitude, latitude] = locality.coordinates;

  return (
    <section className="locality-panel mt-5 flex items-center justify-between gap-7 border-y border-text/10 py-[18px]">
      <div className="min-w-[180px]">
        <span className="text-[9px] font-bold tracking-[1px] text-text/60">
          {`${locality.department} · ${locality.province}`.toUpperCase()}
        </span>
        <h2 className="mt-1 text-text font-display text-[23px] font-medium">{locality.name}</h2>
        <span className="mt-1.5 block text-text/70 text-xs">
          {Math.abs(latitude).toFixed(5)}° S, {Math.abs(longitude).toFixed(5)}° O
        </span>
      </div>

      <div className="grid max-w-[760px] w-full grid-cols-3 border-l border-text/10">
        <article className="grid grid-rows-[auto_auto] gap-1.5 px-[22px] py-1">
          <span className="text-[9px] font-bold tracking-[0.9px] text-text/70">HABITANTES</span>
          <strong className="mt-1.5 font-display text-[20px] font-medium">
            {locality.governmentPopulation === null
              ? 'No disponible'
              : numberFormat.format(locality.governmentPopulation)}
          </strong>
          <span className="mt-1 text-[10px] text-text/55">
            {locality.governmentPopulation === null
              ? 'Sin población municipal asociada'
              : `${locality.municipality ?? 'Municipio'} · INDEC ${locality.governmentPopulationYear}`}
          </span>
        </article>

        <article className="grid grid-rows-[auto_auto] gap-1.5 border-l border-text/10 px-[22px] py-1">
          <span className="text-[9px] font-bold tracking-[0.9px] text-text/70">ALTITUD</span>
          <strong className="mt-1.5 font-display text-[20px] font-medium">
            {locality.elevation === null
              ? 'No disponible'
              : `${numberFormat.format(Math.round(locality.elevation))} m`}
          </strong>
          <span className="mt-1 text-[10px] text-text/55">
            {locality.elevation === null
              ? 'Sin dato de elevación'
              : 'Estimación del modelo en el centroide'}
          </span>
        </article>
      </div>
    </section>
  );
}
