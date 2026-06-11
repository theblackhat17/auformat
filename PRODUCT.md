# Product

## Register

brand

> Le site public (vitrine) est la surface principale : le design EST le produit. L'espace admin (`/admin`, `/dashboard`) est en register **product** — le design sert l'outil ; il est inclus dans le périmètre du redesign mais avec une exigence d'efficacité, pas de spectacle.

## Users

- **Particuliers haut de gamme** (Hauts-de-France : Lille, Le Touquet et alentours) cherchant de l'agencement et de la menuiserie sur mesure : dressing, bibliothèque, meuble TV, plan de travail, bureau. Contexte : projet d'aménagement réfléchi, budget conséquent, comparent 2-3 artisans, jugent la qualité de l'atelier à la qualité du site.
- **Architectes / décorateurs d'intérieur** cherchant un partenaire fabricant fiable pour leurs chantiers.
- **L'équipe Au Format** (admin) : suivi CRM, contenus (blog, réalisations, matériaux, avis), configurateur. Contexte : usage quotidien au bureau ou à l'atelier, efficacité avant tout.

Job to be done (public) : se convaincre que cet atelier est le bon choix pour un projet sur mesure, puis prendre contact ou demander un devis (configurateur).

## Product Purpose

Site vitrine + outil de génération de leads pour Au Format, atelier de menuiserie/agencement bois sur mesure. Succès = demandes de contact et de devis qualifiées, position SEO locale (menuiserie Lille / Le Touquet), image d'atelier premium qui justifie ses prix.

## Brand Personality

**Atelier haut de gamme.** Trois mots : précis, chaleureux, maîtrisé.

- La précision du geste d'artisan transposée à l'écran : alignements exacts, rythme calme, détails soignés.
- La chaleur de la matière : le bois, les photos de réalisations et les tons de la DA portent l'émotion — pas des artifices graphiques.
- Émotions à évoquer : confiance, désir (envie du bel ouvrage), sérénité (on est entre de bonnes mains).
- Le motion est riche mais maîtrisé : reveals au scroll, micro-interactions, compteurs, parallaxe légère. Jamais gratuit.

## Anti-references

- **Template générique d'artisan** : grilles de cartes identiques, emojis en guise d'icônes, sections interchangeables, eyebrows uppercase sur chaque section.
- **Corporate froid** : gris partout, photos stock, langage distant.
- **Surcharge marketing** : pop-ups, compteurs d'urgence, badges promo, CTA agressifs à chaque écran.
- **Effet démo tech** : curseurs custom, particules, 3D décorative, animations qui crient « regardez-moi » sans rapport avec le métier.

## Design Principles

1. **La matière d'abord** — les photos de réalisations et le bois sont les héros ; le design est l'écrin, pas le sujet.
2. **Précision d'atelier** — chaque alignement, espacement et transition est intentionnel, comme un assemblage à queue d'aronde. Pas de scaffolding par réflexe.
3. **Le calme vend le premium** — hiérarchie claire, un CTA principal par écran, de l'air ; la confiance remplace la pression.
4. **Le mouvement révèle, il ne décore pas** — chaque animation accompagne la lecture ou répond à un geste de l'utilisateur ; `prefers-reduced-motion` toujours respecté.
5. **L'admin est un établi** — efficace, dense, lisible ; la personnalité de marque y passe par la cohérence des tokens, pas par le spectacle.

## Accessibility & Inclusion

- **WCAG AA** : contrastes ≥ 4.5:1 (texte courant) / ≥ 3:1 (grands titres, UI), navigation clavier complète, focus visibles, alt texts descriptifs.
- `prefers-reduced-motion: reduce` : alternative crossfade/instantanée pour chaque animation.
- Attention particulière : `bois-clair` (#D4A574) sur fond clair ne passe pas AA comme couleur de texte — réservé aux fonds sombres ou aux éléments décoratifs.
- Langue : français (lang="fr"), public local.
