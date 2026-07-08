'use client';

import { useEffect, useRef, useState } from 'react';

export type PickedClient = { email: string; userId?: string; name?: string };

type ClientOption = { id: string; email: string; fullName: string | null; companyName: string | null; role: string };

/**
 * Sélecteur de client : recherche dans la liste des clients existants (nom, e-mail,
 * société) avec autocomplétion, et permet aussi de saisir un nouvel e-mail pour
 * créer un client à la volée. Renvoie `userId` si un client existant est choisi,
 * sinon l'`email` saisi (nouveau client).
 */
export function ClientPicker({
  value,
  onChange,
  label = 'Client',
  placeholder = 'Rechercher un client ou saisir un e-mail…',
}: {
  value: PickedClient;
  onChange: (v: PickedClient) => void;
  label?: string;
  placeholder?: string;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/clients').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setClients(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = value.email.trim().toLowerCase();
  const matches = clients
    .filter((c) => c.role === 'client')
    .filter((c) => !q || c.email.toLowerCase().includes(q) || (c.fullName || '').toLowerCase().includes(q) || (c.companyName || '').toLowerCase().includes(q))
    .slice(0, 8);

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-xs font-medium text-noir/60 mb-1">{label}</label>
      <input
        type="text"
        value={value.email}
        onChange={(e) => { onChange({ email: e.target.value, userId: undefined, name: value.name }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
      />
      {value.userId && (
        <p className="mt-1 text-xs text-vert-foret">Client existant sélectionné{value.name ? ` : ${value.name}` : ''}</p>
      )}
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => { onChange({ email: c.email, userId: c.id, name: c.fullName || undefined }); setOpen(false); }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-beige/50"
              >
                <span className="text-sm font-medium text-noir">{c.fullName || c.email}</span>
                <span className="text-xs text-noir/50">{c.email}{c.companyName ? ` · ${c.companyName}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
