import { redirect } from 'next/navigation';

// Plus d'inscription libre : les comptes sont créés en interne par un admin.
// Toute visite de /register est redirigée vers la connexion.
export default function RegisterPage() {
  redirect('/login');
}
