'use client';

import type { ConfiguratorConfig } from '@/lib/types';

interface Props {
  config: ConfiguratorConfig;
  dispatch: React.Dispatch<any>;
}

const PRODUCTS = [
  {
    type: 'meuble' as const,
    icon: '🪑',
    title: 'Meuble sur-mesure',
    description: 'Bibliotheque, dressing, meuble TV, rangement...',
    examples: 'Configurez vos caissons, modules et materiaux',
  },
  {
    type: 'planche' as const,
    icon: '📏',
    title: 'Planche decoupee',
    description: 'Planches aux dimensions exactes avec chants',
    examples: 'Etageres, tablettes, plans de travail, panneaux',
  },
  {
    type: 'cuisine' as const,
    icon: '🍳',
    title: 'Cuisine',
    description: 'Cuisine complete avec elements bas, hauts et plan de travail',
    examples: 'Lineaire, en L, en U ou avec ilot central',
  },
];

export function StepProductType({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Que souhaitez-vous configurer ?</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez le type de produit pour commencer</p>

      <div className="grid gap-4">
        {PRODUCTS.map((product) => {
          const isSelected = config.productType === product.type;
          return (
            <button
              key={product.type}
              onClick={() => dispatch({ type: 'SET_PRODUCT_TYPE', productType: product.type })}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-vert-foret bg-vert-foret/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{product.icon}</span>
                <div className="flex-1">
                  <h3 className={`font-semibold text-base ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{product.examples}</p>
                </div>
                {isSelected && (
                  <span className="text-vert-foret text-lg">✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
