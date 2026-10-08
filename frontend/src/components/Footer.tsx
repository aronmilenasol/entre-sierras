export function Footer() {
  return (
    <footer className="mt-8 flex justify-between border-t border-text/10 py-3.5 text-[10px] text-text/65" id="fuentes">
      <span>
        Entre Sierras <span className="px-1 text-text/35">·</span> Datos geográficos de San Luis y Córdoba
      </span>
      <span className="text-right">
        Fuentes:
        <a
          href="https://www.argentina.gob.ar/georef"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          Georef
        </a>
        <span className="px-1">·</span>
        <a
          href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-2-41-165"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          INDEC
        </a>
        <span className="px-1">·</span>
        <a
          href="https://riesgo.ign.gob.ar/"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          IG-GIRD/IGN
        </a>
        <span className="px-1">·</span>
        <a
          href="https://www.argentina.gob.ar/educacion/evaluacion-e-informacion-educativa/padron-oficial-de-establecimientos-educativos"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          Mapa Educativo
        </a>
        <span className="px-1">·</span>
        <a
          href="https://www.smn.gob.ar/indices_peligro_fuego"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          SMN
        </a>
        <span className="px-1">·</span>
        <a
          href="https://firms.modaps.eosdis.nasa.gov/"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          NASA FIRMS
        </a>
        <span className="px-1">·</span>
        <a
          href="https://open-meteo.com/en/docs/elevation-api"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          Open-Meteo
        </a>
        <span className="px-1">·</span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="text-accent"
        >
          OpenStreetMap
        </a>
      </span>
    </footer>
  );
}