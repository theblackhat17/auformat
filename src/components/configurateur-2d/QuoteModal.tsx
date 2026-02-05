'use client';

import { useState } from 'react';
import type {
  Configurateur2DConfig,
  Configurateur2DPriceBreakdown,
  ConfigurateurMaterial,
  ConfigurateurProductType,
  ConfigurateurLabels,
  QuoteFormData,
} from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  config: Configurateur2DConfig;
  price: Configurateur2DPriceBreakdown;
  materials: ConfigurateurMaterial[];
  productTypes: ConfigurateurProductType[];
  labels: ConfigurateurLabels;
}

export function QuoteModal({ open, onClose, config, price, materials, productTypes, labels }: Props) {
  const [form, setForm] = useState<QuoteFormData>({
    nom: '',
    email: '',
    telephone: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  if (!open) return null;

  const material = materials[config.materialIndex] || materials[0];
  const productType = productTypes.find((t) => t.slug === config.productSlug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/configurateur/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          message: form.message,
          productType: productType?.nom || config.productSlug,
          dimensions: `${config.largeur} x ${config.hauteur} x ${config.profondeur} mm (ep. ${config.epaisseur} mm)`,
          materiau: material?.name,
          items: price.lineItems,
          subtotalHt: price.subtotalHt,
          tva: price.tva,
          totalTtc: price.totalTtc,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      setSent(true);
      setQuoteNumber(data.quoteNumber);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    setQuoteNumber(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success state */}
        {sent ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
            <p className="text-sm text-gray-500 mb-1">
              Votre devis <strong>{quoteNumber}</strong> a bien été enregistré.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Une copie a été envoyée à <strong>{form.email}</strong>.
              Notre équipe vous recontactera dans les plus brefs délais.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-[#2C5F2D] text-white rounded-lg hover:bg-[#234a24] transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{labels.modalTitre}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{labels.modalDescription}</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Produit</span>
                  <span className="font-medium">{productType?.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dimensions</span>
                  <span>{config.largeur} x {config.hauteur} x {config.profondeur} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Matériau</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-gray-200 inline-block" style={{ backgroundColor: material?.colorHex }} />
                    {material?.name}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="font-medium">Total TTC</span>
                  <span className="font-bold text-[#2C5F2D]">{formatPrice(price.totalTtc)}</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
                  placeholder="Jean Dupont"
                  disabled={sending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
                  placeholder="jean@exemple.fr"
                  disabled={sending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
                  placeholder="06 12 34 56 78"
                  disabled={sending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D] resize-none"
                  placeholder="Détails complémentaires..."
                  disabled={sending}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-[#2C5F2D] text-white font-medium rounded-lg hover:bg-[#234a24] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {sending ? 'Envoi en cours...' : labels.boutonDevis}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
