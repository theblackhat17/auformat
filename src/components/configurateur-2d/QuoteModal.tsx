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

  if (!open) return null;

  const material = materials[config.materialIndex] || materials[0];
  const productType = productTypes.find((t) => t.slug === config.productSlug);

  const buildMailtoBody = () => {
    const lines = [
      `${labels.recapTitre}`,
      '',
      `Produit : ${productType?.nom || config.productSlug}`,
      `Dimensions : ${config.largeur} x ${config.hauteur} x ${config.profondeur} mm (ep. ${config.epaisseur} mm)`,
      `Materiau : ${material?.name}`,
      '',
      '--- Options ---',
      ...price.lineItems.map((item) => `${item.label} : ${item.quantity} x ${formatPrice(item.unitPrice)} = ${formatPrice(item.total)}`),
      '',
      `Sous-total HT : ${formatPrice(price.subtotalHt)}`,
      `TVA (20%) : ${formatPrice(price.tva)}`,
      `Total TTC : ${formatPrice(price.totalTtc)}`,
      '',
      '--- Coordonnees ---',
      `Nom : ${form.nom}`,
      `Email : ${form.email}`,
      `Telephone : ${form.telephone}`,
      '',
      `Message : ${form.message}`,
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Demande de devis - ${productType?.nom || 'Configurateur'}`);
    const body = buildMailtoBody();
    window.location.href = `mailto:contact@auformat.fr?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{labels.modalTitre}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{labels.modalDescription}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
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
              <span className="text-gray-500">Materiau</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
              placeholder="jean@exemple.fr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
            <input
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D]"
              placeholder="06 12 34 56 78"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2C5F2D] resize-none"
              placeholder="Details complementaires..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#2C5F2D] text-white font-medium rounded-lg hover:bg-[#234a24] transition-colors"
          >
            {labels.boutonDevis}
          </button>
        </form>
      </div>
    </div>
  );
}
