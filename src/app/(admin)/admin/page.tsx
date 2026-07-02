import { redirect } from 'next/navigation';

// La gestion de projet est le cœur de l'admin : l'accueil ouvre directement le hub Projets.
export default function AdminHomePage() {
  redirect('/admin/projets');
}
