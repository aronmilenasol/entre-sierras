import { ArrowLeft, ArrowUpRight, Database, MapPinned } from 'lucide-react';
import { NavBar } from './NavBar';
import { Footer } from './Footer';

export function AboutPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="min-h-screen ml-[228px]" id="inicio">
        <header className="sticky top-0 z-[4] flex h-[62px] items-center border-b border-text/10 bg-background/95 px-12 backdrop-blur-[12px]">
          <a
            className="inline-flex items-center gap-2 text-xs font-semibold text-secondary"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al mapa
          </a>
        </header>
        <div className="page-content mx-auto w-full max-w-[1440px] px-12 pt-11 pb-5">
          <section className="max-w-[760px]" aria-labelledby="about-title">
            <span className="text-[9px] font-bold tracking-[1px] text-text/60">ACERCA DE</span>
            <h1
              id="about-title"
              className="mt-2 font-display text-[42px] font-medium leading-[1.1]"
            >
              Entre Sierras
            </h1>
            <p className="mt-4 text-sm leading-[1.7] text-text/70">
              Entre Sierras reúne información territorial de las localidades de San Luis y Córdoba
              en un mapa interactivo. Permite consultar población, elevación, servicios cercanos y
              referencias sobre riesgos ambientales. <br />
              Debido a que me mudo en 2027 a Córdoba desde Buenos Aires, decidí crear este proyecto
              para poder visualizar todos estos datos de forma sencilla, sin tener que buscar en
              Internet constantemente.
            </p>
            <div className="mt-8 grid gap-5 border-t border-text/10 pt-6 sm:grid-cols-2">
              <article>
                <MapPinned className="h-5 w-5 text-secondary" />
                <h2 className="mt-3 font-display text-xl font-medium">Stack tecnológico</h2>
                <p className="mt-2 text-xs leading-[1.7] text-text/70">
                  Tecnologías usadas en la aplicación:
                </p>
                <dl className="mt-4 grid gap-3 text-xs leading-[1.6]">
                  <div>
                    <dt className="font-semibold text-text">Backend</dt>
                    <dd className="m-0 text-text/70">Python · FastAPI · Uvicorn</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text">Frontend</dt>
                    <dd className="m-0 text-text/70">React · TypeScript · Vite</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text">Interfaz y mapas</dt>
                    <dd className="m-0 text-text/70">Tailwind CSS · Leaflet · OpenStreetMap</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text">Cliente HTTP</dt>
                    <dd className="m-0 text-text/70">Axios</dd>
                  </div>
                </dl>
              </article>
              <article>
                <Database className="h-5 w-5 text-secondary" />
                <h2 className="mt-3 font-display text-xl font-medium">Fuentes abiertas</h2>
                <p className="mt-2 text-xs leading-[1.7] text-text/70">
                  Los datos provienen de organismos públicos y proyectos abiertos. Sus enlaces y
                  atribuciones están disponibles al pie del mapa.
                </p>
              </article>
            </div>
            <a
              className="mt-8 inline-flex items-center gap-2 border-t border-text/10 pt-5 text-xs font-semibold text-secondary transition-colors hover:text-accent"
              href="https://github.com/aronmilenasol/entre-sierras"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRight className="h-4 w-4" />
              Ver el proyecto en GitHub
            </a>
          </section>
          <Footer />
        </div>
      </main>
    </div>
  );
}
