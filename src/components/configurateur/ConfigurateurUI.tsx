'use client';

import { useState } from 'react';
import type { FurnitureConfig, Cabinet } from '@/lib/types';
import type { PriceBreakdown, ConfiguratorStats } from './useConfigurator';
import { WOOD_MATERIALS, MODULES_CATALOG, HANDLE_TYPES } from '@/lib/constants';

interface ConfigurateurUIProps {
  furniture: FurnitureConfig;
  price: PriceBreakdown;
  stats: ConfiguratorStats;
  onSetMaterial: (m: string) => void;
  onSetHandle: (h: string) => void;
  onSetName: (n: string) => void;
  onAddCabinet: () => void;
  onRemoveCabinet: (id: number) => void;
  onUpdateCabinet: (id: number, updates: Partial<Cabinet>) => void;
  onAddModule: (cabinetId: number, moduleType: string) => void;
  onRemoveModule: (cabinetId: number, moduleId: number) => void;
  onSelectTemplate: (t: string) => void;
  onToggleExploded: () => void;
  onSave: () => void;
  onExport: () => void;
  isSaving?: boolean;
}

export default function ConfigurateurUI({
  furniture,
  price,
  stats,
  onSetMaterial,
  onSetHandle,
  onSetName,
  onAddCabinet,
  onRemoveCabinet,
  onUpdateCabinet,
  onAddModule,
  onRemoveModule,
  onSelectTemplate,
  onToggleExploded,
  onSave,
  onExport,
  isSaving,
}: ConfigurateurUIProps) {
  const [activeCabinetId, setActiveCabinetId] = useState(furniture.cabinets[0]?.id ?? 1);
  const [activeSection, setActiveSection] = useState<string>('template');

  const activeCabinet = furniture.cabinets.find((c) => c.id === activeCabinetId) ?? furniture.cabinets[0];

  const templates = [
    { key: 'custom', label: 'Personnalise', desc: 'Partez de zero' },
    { key: 'wardrobe', label: 'Dressing', desc: '3 caissons, 2.4m' },
    { key: 'kitchen-base', label: 'Meuble bas cuisine', desc: '1 caisson, 72cm' },
  ];

  const sections = [
    { key: 'template', label: 'Modele' },
    { key: 'material', label: 'Materiau' },
    { key: 'cabinets', label: 'Caissons' },
    { key: 'modules', label: 'Modules' },
    { key: 'handles', label: 'Poignees' },
  ];

  return (
    <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-vert-foret to-vert-foret-dark">
        <input
          type="text"
          value={furniture.name}
          onChange={(e) => onSetName(e.target.value)}
          className="w-full bg-white/10 text-white placeholder-white/60 border border-white/20 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Nom du meuble"
        />
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeSection === s.key
                ? 'text-vert-foret border-b-2 border-vert-foret bg-green-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Templates */}
        {activeSection === 'template' && (
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => onSelectTemplate(t.key)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  furniture.template === t.key
                    ? 'border-vert-foret bg-green-50 ring-1 ring-vert-foret/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Materials */}
        {activeSection === 'material' && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(WOOD_MATERIALS).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => onSetMaterial(key)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  furniture.material === key
                    ? 'border-vert-foret ring-1 ring-vert-foret/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-full h-8 rounded mb-2 border border-gray-100"
                  style={{ backgroundColor: `#${mat.color.toString(16).padStart(6, '0')}` }}
                />
                <div className="text-sm font-medium">{mat.name}</div>
                <div className="text-xs text-gray-500">{mat.price} EUR/m2</div>
              </button>
            ))}
          </div>
        )}

        {/* Cabinets */}
        {activeSection === 'cabinets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {furniture.cabinets.length} caisson{furniture.cabinets.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={onAddCabinet}
                className="text-xs bg-vert-foret text-white px-3 py-1.5 rounded-lg hover:bg-vert-foret-dark transition-colors"
              >
                + Ajouter
              </button>
            </div>

            {furniture.cabinets.map((cab) => (
              <div
                key={cab.id}
                className={`border rounded-lg p-3 transition-all ${
                  cab.id === activeCabinetId
                    ? 'border-vert-foret bg-green-50/50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setActiveCabinetId(cab.id)}
                    className="text-sm font-medium hover:text-vert-foret"
                  >
                    Caisson {cab.id}
                  </button>
                  {furniture.cabinets.length > 1 && (
                    <button
                      onClick={() => onRemoveCabinet(cab.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                {cab.id === activeCabinetId && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">L (mm)</label>
                        <input
                          type="number"
                          value={cab.width}
                          onChange={(e) =>
                            onUpdateCabinet(cab.id, { width: Number(e.target.value) || 800 })
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          step={50}
                          min={400}
                          max={2000}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">H (mm)</label>
                        <input
                          type="number"
                          value={cab.height}
                          onChange={(e) =>
                            onUpdateCabinet(cab.id, { height: Number(e.target.value) || 2200 })
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          step={50}
                          min={400}
                          max={2800}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">P (mm)</label>
                        <input
                          type="number"
                          value={cab.depth}
                          onChange={(e) =>
                            onUpdateCabinet(cab.id, { depth: Number(e.target.value) || 600 })
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                          step={50}
                          min={300}
                          max={800}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {cab.modules.length} module{cab.modules.length > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modules */}
        {activeSection === 'modules' && (
          <div className="space-y-4">
            {/* Cabinet selector */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Caisson actif</label>
              <select
                value={activeCabinetId}
                onChange={(e) => setActiveCabinetId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {furniture.cabinets.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caisson {c.id} ({c.width}x{c.height}mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Add module buttons */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Ajouter un module</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MODULES_CATALOG).map(([key, mod]) => (
                  <button
                    key={key}
                    onClick={() => onAddModule(activeCabinetId, key)}
                    className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-vert-foret hover:bg-green-50/50 transition-all text-left"
                  >
                    <span className="text-lg">{mod.icon}</span>
                    <div>
                      <div className="text-xs font-medium">{mod.name}</div>
                      <div className="text-[10px] text-gray-400">{mod.basePrice} EUR</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Module list for active cabinet */}
            {activeCabinet && (
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  Modules du caisson {activeCabinetId}
                </div>
                {activeCabinet.modules.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-6 border border-dashed border-gray-200 rounded-lg">
                    Aucun module
                    <br />
                    <span className="text-xs">Cliquez ci-dessus pour en ajouter</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeCabinet.modules.map((m) => {
                      const catalog = MODULES_CATALOG[m.type];
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{catalog?.icon}</span>
                            <div>
                              <div className="text-xs font-medium">{catalog?.name}</div>
                              <div className="text-[10px] text-gray-400">Pos: {Math.round(m.position)}mm</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveModule(activeCabinetId, m.id)}
                            className="text-xs text-red-400 hover:text-red-600 p-1"
                          >
                            Suppr.
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Handles */}
        {activeSection === 'handles' && (
          <div className="space-y-2">
            {Object.entries(HANDLE_TYPES).map(([key, h]) => (
              <button
                key={key}
                onClick={() => onSetHandle(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  furniture.globalHandle === key
                    ? 'border-vert-foret bg-green-50 ring-1 ring-vert-foret/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl w-8 text-center">{h.icon}</span>
                <div>
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="text-xs text-gray-500">{h.price} EUR / unite</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-vert-foret">{stats.cabinetCount}</div>
            <div className="text-[10px] text-gray-500">Caissons</div>
          </div>
          <div>
            <div className="text-lg font-bold text-vert-foret">{stats.moduleCount}</div>
            <div className="text-[10px] text-gray-500">Modules</div>
          </div>
          <div>
            <div className="text-lg font-bold text-vert-foret">{stats.totalWidth}</div>
            <div className="text-[10px] text-gray-500">Largeur mm</div>
          </div>
          <div>
            <div className="text-lg font-bold text-vert-foret">{stats.volume}</div>
            <div className="text-[10px] text-gray-500">Volume L</div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Materiau</span>
            <span>{price.materialCost.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Modules</span>
            <span>{price.modulesCost.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Quincaillerie</span>
            <span>{price.hardwareCost.toFixed(2)} EUR</span>
          </div>
          <div className="h-px bg-gray-200 my-1" />
          <div className="flex justify-between text-gray-500">
            <span>HT</span>
            <span>{price.subtotalHt.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>TVA 20%</span>
            <span>{price.tva.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-vert-foret pt-1">
            <span>Total TTC</span>
            <span>{price.totalTtc.toFixed(2)} EUR</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-vert-foret text-white py-2.5 rounded-lg font-medium hover:bg-vert-foret-dark transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder le projet'}
        </button>
        <button
          onClick={onExport}
          className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Exporter la configuration
        </button>
      </div>
    </div>
  );
}
