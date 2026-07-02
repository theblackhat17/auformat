import { redirect } from 'next/navigation';

// Les devis (et tout montant) sont désormais gérés uniquement en interne par l'atelier :
// le client ne voit jamais de prix. On redirige vers ses projets.
export default function MesDevisPage() {
  redirect('/mes-projets');
}
