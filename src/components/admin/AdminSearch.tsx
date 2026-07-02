'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { searchAdmin, buildAdminSearchIndex, type AdminSearchEntry } from '@/lib/admin-search';

/** Barre de recherche admin large, en haut du contenu, avec résultats détaillés en direct. */
export function AdminSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openList, setOpenList] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const index = useMemo(() => buildAdminSearchIndex(), []);
  const results = useMemo(() => searchAdmin(query, index).slice(0, 40), [query, index]);

  // ⌘K / Ctrl+K : focus la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpenList(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fermer au clic extérieur
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenList(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { setActive(0); }, [query]);

  const go = (entry: AdminSearchEntry) => {
    setOpenList(false);
    setQuery('');
    router.push(entry.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpenList(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { setOpenList(false); inputRef.current?.blur(); }
  };

  const show = openList && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-3 bg-white ring-1 ring-gray-200 rounded-xl px-4 shadow-sm focus-within:ring-2 focus-within:ring-vert-foret/40 transition-shadow">
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpenList(true); }}
          onFocus={() => setOpenList(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un réglage, un paramètre, une page… (socle, TVA, matériaux, tags…)"
          aria-label="Rechercher dans l'administration"
          className="flex-1 py-3.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
        />
        {query ? (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Effacer" className="text-gray-400 hover:text-gray-700 p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        ) : (
          <kbd className="hidden sm:inline text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">⌘K</kbd>
        )}
      </div>

      {show && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl ring-1 ring-gray-200 shadow-xl overflow-hidden z-50 max-h-[65vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucun résultat pour « {query} ».</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.href}-${r.label}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${i === active ? 'bg-vert-foret/10' : 'hover:bg-gray-50'}`}
              >
                <span className="text-base w-5 text-center flex-shrink-0">{r.icon || '•'}</span>
                <span className="flex-1 text-sm text-gray-800">{r.label}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{r.group}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
