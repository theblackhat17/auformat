import type { Metadata } from 'next';
import { ProjectConfigClient } from './ProjectConfigClient';

export const metadata: Metadata = { title: 'Configuration des projets' };

export default function AdminProjetsConfigPage() {
  return <ProjectConfigClient />;
}
