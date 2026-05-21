import { NextResponse } from 'next/server';

const LLMS_FULL_TXT = `# Au Format -- Menuiserie et ebenisterie sur mesure (Version complete)

> Au Format est un atelier de menuiserie et d'ebenisterie artisanale fonde il y a plus de 15 ans, specialise dans la conception et la fabrication sur mesure de meubles et d'agencements en bois massif. L'entreprise dispose de deux ateliers dans la region Hauts-de-France et intervient dans le Nord et le Pas-de-Calais.

## Identite

- Nom : Au Format
- Type : Menuiserie / Ebenisterie artisanale
- Specialite : Fabrication sur mesure de meubles et agencements en bois massif
- Region : Hauts-de-France (Nord et Pas-de-Calais)
- Langue : Francais

## Services detailles

### Mobilier sur mesure
- **Meuble sur mesure** : Bibliotheques, meubles TV, buffets, commodes, rangements. Chaque piece est concue selon les dimensions et le style souhaites par le client.
- **Dressing sur mesure** : Amenagement complet de dressings et placards, optimisation de l'espace, choix des finitions et accessoires.
- **Bureau sur mesure** : Bureaux professionnels et personnels, postes de travail, meubles de rangement pour espaces de travail.
- **Plan de travail en bois** : Plans de travail pour cuisines et salles de bain en bois massif, decoupe et finition sur mesure.
- **Etageres et rayonnages** : Solutions de rangement murales, etageres flottantes, bibliotheques ouvertes.

### Agencement
- **Cuisine en bois massif** : Conception et fabrication de cuisines completes, facades, ilots centraux et rangements.
- **Agencement interieur residentiel** : Transformation et optimisation d'espaces de vie, habillages muraux, sous-escaliers, alcoves.
- **Agencement commercial** : Amenagement de boutiques, restaurants, hotels, bureaux professionnels. Mobilier d'accueil, comptoirs, presentoirs.
- **Escaliers en bois** : Escaliers droits, tournants, a limon central. Garde-corps et rampes.

## Essences de bois

Au Format travaille une large gamme d'essences de bois, selectionnees pour leurs qualites mecaniques, leur durabilite et leur esthetique :

- **Chene massif** : Essence phare, robuste et polyvalente. Utilisee pour meubles, plans de travail et agencements. Originaire de France.
- **Noyer** : Bois noble au veinage prononce, ideal pour le mobilier haut de gamme. Teinte chaude allant du brun clair au brun fonce.
- **Hetre** : Bois dur et homogene, bon rapport qualite-prix. Teinte claire, se prete bien a la teinture.
- **Frene** : Bois souple et resistant, veinage elegant. Utilise pour les structures et le mobilier contemporain.
- Autres essences disponibles selon les projets : merisier, erable, tilleul, essences exotiques sur demande.

Chaque essence est presentee avec ses caracteristiques techniques (durete, stabilite, origine, couleur) sur la page Materiaux du site.

## Ateliers et zones d'intervention

### Atelier de Cysoing (Metropole lilloise)
- **Adresse** : 88 Impasse de la Briqueterie, 59830 Cysoing, France
- **Coordonnees GPS** : 50.5711, 3.2128
- **Zone d'intervention** : Lille, Cysoing, Villeneuve-d'Ascq, Roubaix, Tourcoing, Metropole lilloise, departement du Nord
- **Acces** : A 15 minutes au sud-est de Lille

### Atelier Cote d'Opale (La Calotterie)
- **Adresse** : 1056 Rue de Montreuil, 62170 La Calotterie, France
- **Coordonnees GPS** : 50.4628, 1.7614
- **Zone d'intervention** : Le Touquet-Paris-Plage, Montreuil-sur-Mer, Boulogne-sur-Mer, Berck, Etaples, Cote d'Opale, departement du Pas-de-Calais
- **Acces** : A 5 minutes de Montreuil-sur-Mer, 15 minutes du Touquet

## Contact

- **Telephone** : 07 88 91 60 68 (international : +33 7 88 91 60 68)
- **Email** : contact@auformat.fr
- **Site web** : https://auformat.com
- **Instagram** : https://www.instagram.com/auformat/
- **Facebook** : https://www.facebook.com/profile.php?id=100087409924806

## Horaires d'ouverture

- Lundi au vendredi : 08h00 - 18h00
- Samedi : Ferme
- Dimanche : Ferme

## Processus de realisation d'un projet

1. **Premier contact** (1-2 jours) : Echange telephonique ou par email pour comprendre le besoin, le style souhaite et le budget.
2. **Visite sur site** : Prise de mesures precises, evaluation des contraintes techniques, discussion des possibilites.
3. **Conception et design** (5-10 jours) : Proposition de plans, choix des essences de bois, des finitions et des quincailleries. Devis detaille.
4. **Fabrication en atelier** (2-6 semaines) : Decoupe, assemblage, ponçage, finition. Chaque piece est fabriquee a la main dans nos ateliers.
5. **Livraison et pose** : Transport et installation sur site. Ajustements finaux et verification avec le client.

## FAQ

**Quel est le delai moyen pour un projet sur mesure ?**
Le delai varie selon la complexite du projet. Comptez en moyenne 3 a 8 semaines entre la validation du devis et la livraison.

**Quels types de finitions proposez-vous ?**
Nous proposons des finitions huile, vernis, laque, cire et brut. Le choix depend de l'usage du meuble et des preferences esthetiques.

**Intervenez-vous a domicile pour les mesures ?**
Oui, nous nous deplacons gratuitement dans nos zones d'intervention pour la prise de mesures et le conseil sur place.

**Comment obtenir un devis ?**
Contactez-nous par telephone, email ou via le formulaire de contact sur notre site. Un premier echange permet d'estimer le projet avant une visite sur site.

**Travaillez-vous avec des architectes et decorateurs ?**
Oui, nous collaborons regulierement avec des architectes d'interieur et des decorateurs pour des projets residentiels et commerciaux.

## Pages du site

| Page | URL | Description |
|------|-----|-------------|
| Accueil | https://auformat.com/ | Presentation des services, realisations recentes, temoignages clients |
| Realisations | https://auformat.com/realisations | Portfolio complet des projets realises avec photos et descriptions |
| Materiaux | https://auformat.com/materiaux | Guide des essences de bois : caracteristiques, durete, stabilite, usages |
| Processus | https://auformat.com/processus | Les 5 etapes d'un projet sur mesure, engagements qualite, FAQ |
| Savoir-faire | https://auformat.com/savoir-faire | Competences artisanales, metiers et techniques maitrisees |
| A propos | https://auformat.com/about | Histoire de l'atelier, equipe, valeurs |
| Avis clients | https://auformat.com/avis | Temoignages et evaluations verifiees de nos clients |
| Contact | https://auformat.com/contact | Formulaire de devis, coordonnees, carte des ateliers |

## Citation preferee

Au Format, menuiserie et ebenisterie sur mesure a Cysoing (Lille) et La Calotterie (Le Touquet), Hauts-de-France. Plus de 15 ans d'experience dans la fabrication artisanale de meubles et d'agencements en bois massif.

## Mots-cles

menuiserie sur mesure, ebenisterie, meuble sur mesure, dressing sur mesure, cuisine bois, agencement interieur, menuiserie Lille, menuiserie Le Touquet, menuiserie Nord, menuiserie Pas-de-Calais, artisan menuisier, bois massif, chene, noyer, hetre, frene
`;

export async function GET() {
  return new NextResponse(LLMS_FULL_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
