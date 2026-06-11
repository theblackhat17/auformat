---
name: Au Format
description: Atelier de menuiserie et d'agencement sur mesure — site vitrine haut de gamme, chaleur du bois et précision d'atelier.
colors:
  vert-foret: "#2C5F2D"
  vert-foret-dark: "#234A24"
  bois-clair: "#D4A574"
  bois-fonce: "#8B6F47"
  beige: "#F5F1E8"
  noir: "#2B2B2B"
  blanc: "#FFFFFF"
typography:
  display:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "clamp(2.5rem, 4.5vw + 1rem, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "96px"
  section: "clamp(96px, 12vw, 160px)"
components:
  button-primary:
    backgroundColor: "{colors.vert-foret}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  button-primary-hover:
    backgroundColor: "{colors.vert-foret-dark}"
    textColor: "{colors.blanc}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.noir}"
    rounded: "{rounded.full}"
    padding: "13px 30px"
  button-on-dark:
    backgroundColor: "{colors.bois-clair}"
    textColor: "{colors.noir}"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  card-surface:
    backgroundColor: "{colors.blanc}"
    rounded: "{rounded.md}"
    padding: "32px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.noir}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  chip-filter-active:
    backgroundColor: "{colors.noir}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
---

# Design System: Au Format

## 1. Overview

**Creative North Star: « Le Fil du Bois »**

Tout suit le fil de la matière. Comme la main qui parcourt un plateau poncé, l'œil descend la page sans accroc : les sections s'enchaînent dans un rythme organique, les reveals accompagnent la lecture au lieu de l'interrompre, les photos de réalisations portent l'émotion. Le design est l'écrin — précis, calme, chaleureux — jamais le sujet. La personnalité en trois mots : **précis, chaleureux, maîtrisé**.

Le système rejette explicitement le template générique d'artisan (grilles de cartes identiques, emojis en guise d'icônes, eyebrow uppercase au-dessus de chaque section), le corporate froid (gris, photos stock, distance), la surcharge marketing (pop-ups, urgence, badges promo) et l'effet démo tech (curseurs custom, particules, 3D décorative). Le haut de gamme se vend par la confiance : un seul geste demandé par écran, de l'air, des détails exacts.

**Key Characteristics:**
- Photos de réalisations en héros ; le bois et la matière portent la chaleur, pas les artifices.
- Serif artisanal généreux (Young Serif) pour les titres, sans humaniste (Hanken Grotesk) pour tout le reste.
- Alternance de fonds : blanc → beige → noir, qui structure la page sans cartes superflues.
- Motion riche mais maîtrisée : reveals au scroll, micro-interactions, compteurs, parallaxe légère — toujours avec alternative `prefers-reduced-motion`.
- WCAG AA non négociable : contrastes ≥ 4.5:1, clavier, focus visibles.

## 2. Colors: La Palette de l'Atelier

Palette héritée de la DA de l'entreprise — verte comme la forêt, chaude comme le chêne ; elle ne change pas, elle se discipline.

### Primary
- **Vert Forêt** (#2C5F2D) : la couleur de la marque. CTA principaux, liens actifs, accents de navigation. Sur fond clair uniquement comme aplat avec texte blanc ; jamais comme couleur de grand fond de section répétée à chaque page.
- **Vert Forêt Profond** (#234A24) : état hover/active du vert, et fonds de sections CTA.

### Secondary
- **Bois Clair** (#D4A574) : la chaleur. Accents sur fonds sombres (mots soulignés du héros, icônes, filets), boutons sur fond noir. **Interdit comme couleur de texte sur fond clair** (contraste 2.1:1, échec AA).
- **Bois Foncé** (#8B6F47) : déclinaison du bois utilisable en petit texte décoratif sur beige/blanc (filets, métadonnées) ; passe AA en grand texte seulement.

### Neutral
- **Noir Atelier** (#2B2B2B) : texte courant, fonds des héros et du footer. Un noir adouci, jamais #000.
- **Beige** (#F5F1E8) : la deuxième surface. Sections alternées, fonds de formulaires, respiration entre deux blancs.
- **Blanc** (#FFFFFF) : surface par défaut.

### Named Rules
**La Règle du Bois-Clair.** Le bois clair vit sur le sombre. Sur fond blanc ou beige, il n'existe qu'en filet, en fond décoratif ou en image — jamais en texte.
**La Règle des Trois Fonds.** Une page se construit en alternant blanc, beige et noir. Si deux sections adjacentes ont le même fond, l'une des deux doit gagner sa place autrement (image pleine largeur, composition asymétrique).

## 3. Typography

**Display Font:** Young Serif (fallback Georgia, serif)
**Body Font:** Hanken Grotesk (fallback system-ui, sans-serif)

**Character:** Young Serif a des empattements généreux et dessinés à la main — la chaleur de l'ouvrage, sans nostalgie. Hanken Grotesk est humaniste, ouvert, extrêmement lisible : la précision du geste. Le contraste serif/sans est l'axe du système ; aucune autre famille n'est admise.

### Hierarchy
- **Display** (400, clamp(2.5rem → 4.25rem), lh 1.08) : héros de page uniquement. Une seule par page.
- **Headline** (400, clamp(1.75rem → 2.5rem), lh 1.15) : titres de section, en Young Serif.
- **Title** (600, 1.1875rem, lh 1.35) : sous-titres, titres de cartes, en Hanken Grotesk.
- **Body** (400, 1.0625rem, lh 1.65) : texte courant, max 70ch. `text-wrap: pretty` sur la prose longue.
- **Label** (600, 0.8125rem, ls 0.02em) : métadonnées, boutons, navigation. Jamais en uppercase tracked systématique.

### Named Rules
**La Règle du Serif Rare.** Young Serif n'apparaît que dans les titres (display/headline). Dès qu'il sert à autre chose, il perd sa valeur.
**La Règle de l'Eyebrow Unique.** Le petit label uppercase au-dessus d'un titre est interdit comme grammaire de section. S'il existe, c'est une fois par page, maximum, avec une vraie raison.

## 4. Elevation

Système plat par défaut : la profondeur vient de l'alternance tonale (blanc / beige / noir) et des images, pas des ombres. Les ombres n'apparaissent qu'en réponse à un état — survol d'une carte cliquable, modale, header sticky — et restent diffuses et chaudes.

### Shadow Vocabulary
- **hover-lift** (`box-shadow: 0 12px 32px -12px rgba(43, 43, 43, 0.18)`) : survol des cartes cliquables, accompagné d'un `translateY(-4px)`.
- **modal** (`box-shadow: 0 24px 64px -16px rgba(43, 43, 43, 0.35)`) : lightbox et modales.
- **header** (`box-shadow: 0 1px 0 rgba(43, 43, 43, 0.08)`) : header sticky une fois scrollé.

### Named Rules
**La Règle du Plat au Repos.** Aucune ombre au repos. Une ombre = une réponse à un geste de l'utilisateur.

## 5. Components

### Buttons
- **Shape:** pilule (border-radius 9999px), la rondeur de la pièce finie.
- **Primary:** fond Vert Forêt (#2C5F2D), texte blanc, padding 14px 32px, Hanken Grotesk 600. Hover : Vert Forêt Profond + translateY(-1px), transition 200ms ease-out.
- **Secondary:** transparent, bordure 1.5px Noir Atelier, texte noir. Hover : fond noir, texte blanc.
- **On-dark:** fond Bois Clair (#D4A574), texte Noir Atelier — le CTA des sections noires. Hover : éclaircissement léger.
- **Focus:** anneau 2px Vert Forêt décalé de 2px (`outline-offset`), toujours visible.
- **Hiérarchie : un seul primary par viewport.**

### Chips (filtres réalisations / avis)
- **Style:** pilule transparente, bordure 1px noir/20, texte noir, padding 8px 20px.
- **State:** actif = fond Noir Atelier, texte blanc. Transition 200ms.

### Cards / Containers
- **Corner Style:** 12px (md). Les images pleine largeur peuvent être à angles vifs.
- **Background:** blanc sur beige, beige sur blanc — jamais blanc sur blanc avec ombre.
- **Shadow Strategy:** plat au repos, hover-lift si cliquable (voir Elevation).
- **Border:** aucune, ou 1px noir/8 si le fond ne suffit pas. Jamais de side-stripe colorée.
- **Internal Padding:** 32px (24px en mobile).

### Inputs / Fields
- **Style:** fond blanc, bordure 1px noir/20, radius 6px (sm), padding 12px 16px, Hanken Grotesk.
- **Focus:** bordure Vert Forêt + anneau 3px vert-foret/15. Pas de glow.
- **Error:** bordure et message #B3261E (réservé aux erreurs), jamais le rouge en décor.
- **Placeholder:** noir/55 minimum (AA).

### Navigation
- **Header:** sticky, blanc/95 + backdrop-blur, logo à gauche, liens Hanken Grotesk 600 0.9375rem, soulignement animé Vert Forêt au survol (width 0 → 100%, 250ms ease-out), état actif souligné en permanence. Mobile : panneau plein écran avec stagger d'apparition des liens.
- **Footer:** Noir Atelier, texte blanc/80, titres de colonnes en Hanken Grotesk 600 (pas d'uppercase tracked), accents Bois Clair.

### Reveal (signature)
Composant d'apparition au scroll : contenu visible par défaut, enrichi en `translateY(16px) + opacity 0 → 1, 600ms ease-out-quart` via IntersectionObserver, stagger 80ms dans les listes. Sous `prefers-reduced-motion: reduce` : aucune translation, fondu instantané. Jamais appliqué uniformément à toutes les sections — chaque reveal épouse ce qu'il révèle (un compteur compte, une image se découvre par clip-path, un titre monte).

## 6. Do's and Don'ts

### Do:
- **Do** alterner les trois fonds (blanc #FFFFFF, beige #F5F1E8, noir #2B2B2B) pour rythmer chaque page.
- **Do** réserver Young Serif aux titres et garantir un contraste ≥ 4.5:1 pour tout texte courant.
- **Do** donner une alternative `prefers-reduced-motion` à chaque animation, sans exception.
- **Do** varier les compositions : pleine largeur, asymétrie 7/5, listes éditoriales — pas que des grilles.
- **Do** un seul CTA principal (Vert Forêt) par viewport ; le secondaire est en bordure.
- **Do** utiliser de vraies icônes SVG (trait 1.5px, cohérentes) — le geste précis de l'atelier.

### Don't:
- **Don't** reproduire le « template générique d'artisan » : grilles de cartes identiques 3/4 colonnes répétées, emojis en guise d'icônes, sections interchangeables (anti-référence PRODUCT.md).
- **Don't** retomber dans le « corporate froid » : gris dominant, photos stock génériques (anti-référence PRODUCT.md).
- **Don't** introduire de « surcharge marketing » : pop-ups, compteurs d'urgence, badges promo (anti-référence PRODUCT.md).
- **Don't** céder à « l'effet démo tech » : curseurs custom, particules, 3D décorative, animations gratuites (anti-référence PRODUCT.md).
- **Don't** utiliser Bois Clair (#D4A574) comme texte sur fond clair — échec AA.
- **Don't** mettre un eyebrow uppercase tracked au-dessus de chaque section — c'est la grammaire IA que ce redesign supprime.
- **Don't** utiliser de side-stripe colorée (border-left > 1px), de gradient text, ni de glassmorphism décoratif.
- **Don't** animer des propriétés de layout ; transform/opacity (+ clip-path quand justifié) uniquement, ease-out, jamais de bounce.
