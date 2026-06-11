import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { queryOne, query } from '@/lib/db';
import { getMateriauxForConfigurateur } from '@/lib/content';
import type { CompositionConfig, ConfigurateurSettings, ConfigurateurSettingsRow } from '@/lib/types';
import { ShareClient } from './ShareClient';

export const metadata: Metadata = {
  title: 'Projet partagé — Configurateur Au Format',
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{16,64}$/.test(token)) notFound();

  const project = await queryOne<{ name: string; config: unknown; updatedAt: string }>(
    'SELECT name, config, updated_at FROM projects WHERE share_token = $1',
    [token]
  );
  if (!project) notFound();

  const config = project.config as CompositionConfig;
  const isComposition = config && typeof config === 'object' && config.version === 2;

  // Catalogue nécessaire au rendu (même source que l'API publique)
  const [rows, materials] = await Promise.all([
    query<ConfigurateurSettingsRow>('SELECT key, value FROM configurateur_settings'),
    getMateriauxForConfigurateur(),
  ]);
  const settings: Record<string, unknown> = {};
  for (const row of rows) settings[row.key] = row.value;
  settings.materials = materials.map((m) => ({
    name: m.name,
    colorHex: m.colorHex || '#CCCCCC',
    prixM2: m.prixM2 || 0,
    sortOrder: m.sortOrder || 0,
    image: m.image || null,
  }));

  if (!isComposition) {
    return (
      <div className="min-h-screen bg-beige/40 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl text-noir mb-3">Projet indisponible</h1>
          <p className="text-noir/70">Ce projet a été créé avec une ancienne version du configurateur et ne peut pas être affiché en partage.</p>
        </div>
      </div>
    );
  }

  return <ShareClient name={project.name} config={config} settings={settings as unknown as ConfigurateurSettings} />;
}
