import { useEffect, useState } from 'react';
import { Mountain, Map, Database, Info, Home, Sun, Moon } from 'lucide-react';

export function NavBar() {
  const isAboutPage = window.location.pathname === '/acerca.html';
  const homeHref = isAboutPage ? '/' : '#inicio';
  const mapHref = isAboutPage ? '/#mapa' : '#mapa';
  const sourcesHref = isAboutPage ? '/#fuentes' : '#fuentes';
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = window.localStorage.getItem('theme');
    return savedTheme
      ? savedTheme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <aside className="fixed inset-0 z-[5] flex w-[228px] flex-col border-r border-text/10 bg-background p-[27px_17px_18px]">
      <a
        className="flex items-center gap-2.5 p-2"
        href={homeHref}
        aria-label="Entre Sierras, inicio"
      >
        <span className="grid h-[33px] w-[33px] place-items-center rounded-[10px_10px_10px_3px] bg-primary text-background">
          <Mountain className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <span className="flex flex-col text-sm font-bold leading-[1.13]">
          Entre<span className="text-secondary">Sierras</span>
        </span>
      </a>
      <nav className="grid gap-1" aria-label="Navegación principal">
        <a
          className="flex min-h-10 items-center gap-2.5 rounded px-2.5 text-secondary text-sm transition-colors hover:bg-secondary/10 hover:text-accent"
          href={homeHref}
        >
          <Home className="h-4 w-4" strokeWidth={1.8} />
          <span>Inicio</span>
        </a>
        <a
          className="flex min-h-10 items-center gap-2.5 rounded bg-secondary/10 px-2.5 text-secondary font-medium text-sm"
          href={mapHref}
        >
          <Map className="h-4 w-4" strokeWidth={1.8} />
          <span>Mapa regional</span>
        </a>
        <a
          className="flex min-h-10 items-center gap-2.5 rounded px-2.5 text-secondary text-sm transition-colors hover:bg-secondary/10 hover:text-accent"
          href={sourcesHref}
        >
          <Database className="h-4 w-4" strokeWidth={1.8} />
          <span>Datos y fuentes</span>
        </a>
        <a
          className="flex min-h-10 items-center gap-2.5 rounded px-2.5 text-secondary text-sm transition-colors hover:bg-secondary/10 hover:text-accent"
          href="/acerca.html"
        >
          <Info className="h-4 w-4" strokeWidth={1.8} />
          <span>Acerca de</span>
        </a>
      </nav>

      <button
        className="mt-3 flex min-h-10 items-center gap-2.5 rounded px-2.5 text-secondary text-sm transition-colors hover:bg-secondary/10 hover:text-accent"
        type="button"
        aria-label={isDark ? 'Activar modo claro' : 'Activar modo nocturno'}
        title={isDark ? 'Activar modo claro' : 'Activar modo nocturno'}
        onClick={() => setIsDark(theme => !theme)}
      >
        {isDark ? (
          <Sun className="h-4 w-4" strokeWidth={1.8} />
        ) : (
          <Moon className="h-4 w-4" strokeWidth={1.8} />
        )}
        <span>{isDark ? 'Modo claro' : 'Modo nocturno'}</span>
      </button>

      <div className="mt-auto flex items-center gap-2 border-t border-text/10 pt-4 text-[11px] text-text/70">
        <span className="h-1.5 w-1.5 flex-none rounded-full bg-primary" />
        <span>Explorando San Luis y Córdoba</span>
        <span className="ml-auto grid h-[25px] w-[25px] place-items-center rounded-full border border-text/10 text-[9px] font-bold text-secondary">
          ES
        </span>
      </div>
    </aside>
  );
}
