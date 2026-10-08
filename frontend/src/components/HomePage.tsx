import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, ZoomIn, Share2, ArrowDown } from 'lucide-react';
import { NavBar } from './NavBar';
import { SearchBox } from './SearchBox';
import { MapContainer } from './MapContainer';
import { LocalityPanel } from './LocalityPanel';
import { NearbyServices } from './NearbyServices';
import { RiskPanel } from './RiskPanel';
import { Footer } from './Footer';
import { useLocalityData } from '../hooks/useLocalityData';
import { useNearbyServices } from '../hooks/useNearbyServices';
import { useLocalityContext } from '../hooks/useLocalityContext';
import type { Locality } from '../types';
import { normalizeKey } from '../utils/text';

type Province = 'San Luis' | 'Córdoba';

const provinces: Province[] = ['San Luis', 'Córdoba'];

export function HomePage() {
  const { localities, loading: localitiesLoading, error: localitiesError } = useLocalityData();
  const { services, loading: servicesLoading, error: servicesError, hospitalLookupAvailable, sources, loadServices, clearServices } = useNearbyServices();
  const { context, loading: contextLoading, loadContext, clearContext } = useLocalityContext();
  const [provinceOverride, setProvinceOverride] = useState<Province | null>(() => {
    const province = new URLSearchParams(window.location.search).get('provincia');
    return provinces.includes(province as Province) ? province as Province : null;
  });
  const [selectedLocalityId, setSelectedLocalityId] = useState(() => new URLSearchParams(window.location.search).get('localidad'));
  const localityFromSelection = findLocality(localities, selectedLocalityId);
  const selectedProvince = provinceOverride ?? (localityFromSelection?.province as Province | undefined) ?? 'San Luis';
  const provinceLocalities = useMemo(
    () => localities.filter(locality => locality.province === selectedProvince),
    [localities, selectedProvince]
  );
  const selectedLocality = localityFromSelection?.province === selectedProvince ? localityFromSelection : null;
  const [mapZoom, setMapZoom] = useState<(() => void) | null>(null);
  const registerMapZoom = useCallback((zoom: () => void) => setMapZoom(() => zoom), []);

  const handleSelectLocality = useCallback((locality: Locality) => {
    setSelectedLocalityId(locality.id);
  }, []);

  const handleSelectProvince = useCallback((province: Province) => {
    setProvinceOverride(province);
    setSelectedLocalityId(null);
    clearServices();
    clearContext();
    const params = new URLSearchParams(window.location.search);
    params.set('provincia', province);
    params.delete('localidad');
    window.history.replaceState(null, '', `?${params}`);
    document.title = 'Entre Sierras';
  }, [clearContext, clearServices]);

  useEffect(() => {
    if (!selectedLocality) return;

    loadServices(selectedLocality);
    loadContext(selectedLocality.departmentId);
    const params = new URLSearchParams(window.location.search);
    params.set('provincia', selectedLocality.province);
    params.set('localidad', selectedLocality.id);
    window.history.replaceState(null, '', `?${params}`);
    document.title = `${selectedLocality.name} | Entre Sierras`;
  }, [loadContext, loadServices, selectedLocality]);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="min-h-screen ml-[228px] max-[900px]:!ml-0">
        <section className="home-hero relative flex items-center overflow-hidden" id="inicio" aria-labelledby="home-title">
          <video
            className="home-hero__video"
            src="/background-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <div className="home-hero__content relative z-[1] mx-auto w-full max-w-[1440px] px-12 py-20 text-white">
            <h1 id="home-title" className="m-0 max-w-[760px] font-display text-[clamp(56px,8vw,112px)] font-medium leading-[0.98] text-white">
              Entre Sierras
            </h1>
            <p className="mt-6 max-w-[530px] text-lg leading-[1.65] text-white/85 sm:text-xl">
              Aprendé más sobre las localidades de Córdoba y San Luis. Explorá la población, el relieve y los servicios cercanos a cada localidad.
            </p>
            <a
              className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-sm bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              href="#mapa"
            >
              Explorar localidades
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section id="exploracion" aria-label="Exploración de localidades">
        <header className="sticky top-0 z-[4] flex h-[62px] items-center justify-between border-b border-text/10 bg-background/95 px-12 backdrop-blur-[12px]">
          <div className="flex items-center gap-2 text-[12px] text-text/65">
            <span>Argentina</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <strong className="text-text font-semibold">{selectedProvince}</strong>
            {localitiesLoading ? (
              <span className="ml-2.5 border-l border-text/10 pl-2.5 text-secondary text-xs">Cargando localidades</span>
            ) : (
              <span className="ml-2.5 border-l border-text/10 pl-2.5 text-secondary text-xs">{provinceLocalities.length} sitios registrados</span>
            )}
          </div>

          <SearchBox localities={provinceLocalities} province={selectedProvince} onSelectLocality={handleSelectLocality} />
        </header>

        <div className="page-content mx-auto my-0 w-full max-w-[1440px] px-12 pt-11 pb-5">
          <div className="flex items-center justify-between animate-reveal">
            <div>
              <div className="mb-2.5 flex items-center gap-2 text-[9px] font-bold tracking-[1.15px] text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                EXPLORÁ ENTRE SIERRAS
              </div>
              <p className="m-0 mt-2 text-[12px] text-text/70">
                Obtené más información sobre localidades, población y relieve sobre el mapa.
              </p>
            </div>
            <button
              className="grid h-[34px] w-[34px] flex-none place-items-center rounded border border-text/10 bg-background text-accent transition-colors hover:border-secondary/40 hover:text-primary"
              type="button"
              aria-label="Compartir esta vista"
              title="Compartir mapa"
            >
              <Share2 className="h-[15px] w-[15px]" />
            </button>
          </div>

          <section className="mt-5 min-w-0 animate-reveal" id="mapa" aria-labelledby="map-title">
            <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold tracking-[1px] text-text/60">MAPA INTERACTIVO</span>
                <h2 id="map-title" className="mt-0.5 font-display text-[23px] font-medium">
                  {provinceLocalities.length} localidades
                </h2>
              </div>
              <div className="flex flex-none items-center gap-2">
                <label className="flex h-[34px] items-center gap-2 rounded border border-text/15 bg-background px-2 text-[11px] text-text/65">
                  Provincia
                  <select
                    className="h-full border-0 bg-transparent text-xs font-semibold text-text outline-none"
                    value={selectedProvince}
                    onChange={(event) => handleSelectProvince(event.target.value as Province)}
                    aria-label="Seleccionar provincia"
                  >
                    {provinces.map(province => <option key={province} value={province}>{province}</option>)}
                  </select>
                </label>
                <button
                  className="grid h-[34px] w-[34px] flex-none place-items-center rounded border border-text/10 bg-background text-accent transition-colors hover:border-secondary/40 hover:text-primary"
                  type="button"
                  aria-label="Acercar el mapa"
                  title="Acercar mapa"
                  onClick={() => mapZoom?.()}
                >
                  <ZoomIn className="h-[15px] w-[15px]" />
                </button>
              </div>
            </div>

            <MapContainer
              localities={provinceLocalities}
              selectedLocality={selectedLocality}
              onSelectLocality={handleSelectLocality}
              onZoomReady={registerMapZoom}
            />

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-text/70">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                <span>{selectedLocality ? `${selectedLocality.name} · ${selectedLocality.department}, ${selectedLocality.province}` : 'Seleccioná un punto para ver sus datos'}</span>
              </span>
              <a
                id="external-map-link"
                href="https://www.openstreetmap.org/#map=7/-33.3/-66.34"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-accent font-semibold"
              >
                Abrir en OpenStreetMap
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </section>

          <LocalityPanel locality={selectedLocality} />

          {selectedLocality && (
            <div className="services-grid mt-7 grid grid-cols-[minmax(0,1.35fr)_minmax(270px,0.85fr)] gap-[30px] border-t border-text/10 pt-[22px]">
              <NearbyServices
                services={services}
                loading={servicesLoading}
                error={servicesError}
                hospitalLookupAvailable={hospitalLookupAvailable}
                sources={sources}
                onRetry={() => loadServices(selectedLocality)}
              />
              <RiskPanel context={context} loading={contextLoading} />
            </div>
          )}

          {localitiesError && (
            <p className="mt-[18px] flex items-start gap-2 text-[10px] text-text/65 leading-[1.6]">
              No se pudo cargar el catálogo provincial: {localitiesError}
            </p>
          )}

          {!localitiesLoading && !localitiesError && (
            <p className="mt-[18px] text-[10px] text-text/65">
              Asentamientos: Georef/BAHRA e INDEC · Población por gobierno local: Censo 2022 · Elevación: Open-Meteo.
            </p>
          )}

          <Footer />
        </div>
        </section>
      </main>
    </div>
  );
}

function findLocality(localities: Locality[], identifier: string | null): Locality | null {
  if (!identifier) return null;
  return localities.find(locality => locality.id === identifier || locality.sourceId === identifier) ??
    localities.find(locality => normalizeKey(locality.name) === identifier) ?? null;
}

function ArrowUpRight({ className }: { className?: string }) {
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
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}
