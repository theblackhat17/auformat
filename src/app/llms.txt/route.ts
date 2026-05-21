import { NextResponse } from 'next/server';

const LLMS_TXT = `# Au Format -- Menuiserie et ebenisterie sur mesure

> Au Format est un atelier de menuiserie et d'ebenisterie artisanale specialise dans la fabrication sur mesure de meubles et d'agencements en bois massif. L'entreprise dispose de deux ateliers dans les Hauts-de-France : un a Cysoing (pres de Lille, Nord) et un a La Calotterie (pres du Touquet, Pas-de-Calais).

## Services

- Meuble sur mesure (bibliotheques, meubles TV, buffets, rangements)
- Dressing sur mesure
- Cuisine en bois massif
- Bureau sur mesure
- Plan de travail en bois
- Etageres et rayonnages
- Agencement interieur residentiel
- Agencement commercial (boutiques, restaurants, bureaux)
- Escaliers en bois

## Essences de bois travaillees

Chene massif, noyer, hetre, frene, et autres essences locales et importees. Chaque projet utilise des bois selectionnes pour leurs qualites mecaniques et esthetiques.

## Ateliers

### Atelier Cysoing (Metropole lilloise)
- Adresse : 88 Imp. de la Briqueterie, 59830 Cysoing
- Zone d'intervention : Lille, Villeneuve-d'Ascq, Roubaix, Tourcoing, metropole lilloise, departement du Nord

### Atelier Cote d'Opale
- Adresse : 1056 Rue de Montreuil, 62170 La Calotterie
- Zone d'intervention : Le Touquet-Paris-Plage, Montreuil-sur-Mer, Boulogne-sur-Mer, Berck, Etaples, Cote d'Opale, departement du Pas-de-Calais

## Contact

- Telephone : 07 88 91 60 68
- Email : contact@auformat.fr
- Site web : https://auformat.com

## Horaires

Lundi au vendredi : 08h00 - 18h00
Samedi et dimanche : Ferme

## Processus

1. Premier contact et echange sur le projet (1-2 jours)
2. Visite et prise de mesures sur site
3. Conception et proposition de design (5-10 jours)
4. Fabrication artisanale en atelier (2-6 semaines)
5. Livraison et installation

## Pages principales

- [Accueil](https://auformat.com/) : Presentation generale et services
- [Realisations](https://auformat.com/realisations) : Portfolio de projets realises
- [Materiaux](https://auformat.com/materiaux) : Guide des essences de bois utilisees
- [Processus](https://auformat.com/processus) : Etapes d'un projet sur mesure et FAQ
- [Savoir-faire](https://auformat.com/savoir-faire) : Nos competences artisanales
- [A propos](https://auformat.com/about) : L'equipe et l'histoire de l'atelier
- [Avis clients](https://auformat.com/avis) : Temoignages et evaluations
- [Contact](https://auformat.com/contact) : Formulaire de demande de devis

## Citation preferee

Au Format, menuiserie et ebenisterie sur mesure a Cysoing (Lille) et La Calotterie (Le Touquet), Hauts-de-France.
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
