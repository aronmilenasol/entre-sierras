import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Locality } from '../types';
import { normalizeText } from '../utils/text';

interface SearchBoxProps {
  localities: Locality[];
  province: string;
  onSelectLocality: (locality: Locality) => void;
}

export function SearchBox({ localities, province, onSelectLocality }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredLocalities = localities.filter(locality => {
    const normalizedQuery = normalizeText(query);
    const normalizedLocality = normalizeText(
      `${locality.name} ${locality.category} ${locality.department} ${locality.municipality ?? ''}`,
    );
    return normalizedLocality.includes(normalizedQuery);
  });

  const handleSelect = (locality: Locality) => {
    onSelectLocality(locality);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative flex h-[34px] w-[239px] items-center gap-2 rounded border border-text/15 bg-background px-2">
      <Search className="h-[15px] w-[15px] text-text/60" />
      <input
        type="search"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowResults(e.target.value.length > 0);
        }}
        placeholder="Buscar localidad o paraje"
        className="w-full min-w-0 border-0 bg-transparent text-text text-xs outline-none placeholder:text-text/50"
        aria-label="Buscar localidad, paraje o municipio"
        autoComplete="off"
        aria-controls="search-results"
        aria-expanded={showResults}
      />

      {showResults && (
        <div
          id="search-results"
          className="absolute right-0 left-0 top-[calc(100%+6px)] z-[6] max-h-[min(60vh,440px)] overflow-y-auto rounded border border-text/10 bg-background p-2.5 text-text/70 text-xs shadow-lg"
          role="listbox"
          aria-label={`Localidades y parajes de ${province}`}
        >
          {filteredLocalities.length === 0 ? (
            <p className="m-0 px-0.5 py-1 leading-[1.5]">
              No hay localidades coincidentes en {province}.
            </p>
          ) : (
            filteredLocalities.map(locality => (
              <button
                key={locality.id}
                type="button"
                className="block w-full rounded border-0 bg-transparent p-2 text-left text-text hover:bg-secondary/10 hover:text-accent focus-visible:bg-secondary/10 focus-visible:text-secondary focus-visible:outline-none"
                role="option"
                onClick={() => handleSelect(locality)}
              >
                {locality.name} · {locality.category} · {locality.department}, {locality.province}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
