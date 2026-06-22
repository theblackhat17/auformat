'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { CompositionConfig, CompositionPriceBreakdown, ConfigurateurMaterial, ConfigurateurUnivers } from '@/lib/types';
import { formatEur } from './pricingCompo';

export function CompoQuoteModal({
  config,
  breakdown,
  totalWidth,
  univers,
  materials,
  showPrices = false,
  onClose,
  onSent,
}: {
  config: CompositionConfig;
  breakdown: CompositionPriceBreakdown;
  totalWidth: number;
  univers?: ConfigurateurUnivers;
  materials: ConfigurateurMaterial[];
  showPrices?: boolean;
  onClose: () => void;
  onSent?: (quoteNumber: string) => void;
}) {
  const { profile } = useAuth();
  const [nom, setNom] = useState(profile?.fullName || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [telephone, setTelephone] = useState(profile?.phone || '');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  const universNom = univers?.nom || config.univers;
  const materialName = materials[config.materialIndex]?.name || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('payload', JSON.stringify({
        nom,
        email,
        telephone,
        message,
        productType: `${universNom} sur mesure — ${config.modules.length} module${config.modules.length > 1 ? 's' : ''}`,
        dimensions: `Linéaire ${totalWidth} mm`,
        materiau: materialName,
        items: breakdown.lineItems,
        subtotalHt: breakdown.subtotalHt,
        tva: breakdown.tva,
        totalTtc: breakdown.totalTtc,
        configData: config,
      }));
      for (const f of files) fd.append('fichiers', f);
      const res = await fetch('/api/configurateur/quote', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        return;
      }
      setQuoteNumber(data.quoteNumber);
      onSent?.(data.quoteNumber);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-noir/8">
          <h2 className="font-display text-xl text-noir">{quoteNumber ? 'Demande envoyée' : 'Demander un devis'}</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-beige/70 text-noir/55 hover:text-noir transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {quoteNumber ? (
          <div className="px-6 py-10 text-center">
            <span className="inline-flex w-14 h-14 rounded-full bg-vert-foret/10 text-vert-foret items-center justify-center mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <h3 className="font-display text-xl text-noir mb-2">Devis {quoteNumber}</h3>
            <p className="text-sm text-noir/70 leading-relaxed max-w-sm mx-auto">
              Votre configuration nous a bien été transmise et un récapitulatif vous a été envoyé par email.
              Notre atelier revient vers vous sous 48h pour affiner le projet ensemble.
            </p>
            <button onClick={onClose} className="btn-primary mt-7">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Récapitulatif */}
            <div className="bg-beige/60 rounded-xl p-4 text-sm">
              <p className="font-semibold text-noir mb-1">{universNom} sur mesure — {config.modules.length} module{config.modules.length > 1 ? 's' : ''}</p>
              <p className="text-noir/70">Linéaire {(totalWidth / 1000).toFixed(2).replace('.', ',')} m · {materialName}</p>
              {showPrices ? (
                <p className="text-noir mt-2">
                  Estimation : <strong className="text-vert-foret">{formatEur(breakdown.totalTtc)} TTC</strong>
                  <span className="block text-xs text-noir/55 mt-0.5">Indicative — le devis définitif est établi après étude par l&apos;atelier.</span>
                </p>
              ) : (
                <p className="text-xs text-noir/55 mt-2">
                  L&apos;atelier étudie votre composition et vous transmet un devis chiffré sous 48h — gratuit et sans engagement.
                </p>
              )}
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cq-nom" className="block text-sm font-semibold text-noir/80 mb-1">Nom *</label>
                <input id="cq-nom" required value={nom} onChange={(e) => setNom(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15" />
              </div>
              <div>
                <label htmlFor="cq-tel" className="block text-sm font-semibold text-noir/80 mb-1">Téléphone</label>
                <input id="cq-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15" />
              </div>
            </div>
            <div>
              <label htmlFor="cq-email" className="block text-sm font-semibold text-noir/80 mb-1">Email *</label>
              <input id="cq-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15" />
            </div>
            <div>
              <label htmlFor="cq-msg" className="block text-sm font-semibold text-noir/80 mb-1">Précisions sur votre projet</label>
              <textarea id="cq-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pièce, contraintes, délais souhaités…" className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm placeholder-noir/55 focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15 resize-none" />
            </div>
            <div>
              <label htmlFor="cq-files" className="block text-sm font-semibold text-noir/80 mb-1">
                Photos de la pièce ou plans <span className="font-normal text-noir/50">(optionnel, 3 max)</span>
              </label>
              <input
                id="cq-files"
                type="file"
                accept="image/jpeg,image/png,image/webp,.pdf"
                multiple
                onChange={(e) => {
                  const list = Array.from(e.target.files || []).filter((f) => f.size <= 10 * 1024 * 1024);
                  setFiles((prev) => [...prev, ...list].slice(0, 3));
                  e.target.value = '';
                }}
                className="block w-full text-sm text-noir/70 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-vert-foret/10 file:text-vert-foret file:font-semibold file:cursor-pointer hover:file:bg-vert-foret/20"
              />
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-noir/70 bg-beige/50 rounded-lg px-3 py-1.5">
                      <span className="truncate">📎 {f.name}</span>
                      <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="text-noir/50 hover:text-red-600 font-bold">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? 'Envoi en cours…' : 'Envoyer ma demande de devis'}
            </button>
            <p className="text-xs text-noir/55 text-center">Gratuit et sans engagement. Vos données ne servent qu&apos;au traitement de votre demande.</p>
          </form>
        )}
      </div>
    </div>
  );
}
