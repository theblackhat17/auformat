# 🌲 Au Format - Site Vitrine

[![Netlify Status](https://api.netlify.com/api/v1/badges/9b033a80-7b57-498f-af72-0e79c35390c0/deploy-status)](https://app.netlify.com/projects/auformat/deploys)

## 📖 Description
**Au Format** est un site vitrine moderne et responsive pour une entreprise de menuiserie et d’agencement bois.  
Il présente les savoir-faire, les réalisations et permet aux visiteurs de contacter l’entreprise pour obtenir un devis.

Le site est statique (HTML, CSS, JS) et déployé sur **Netlify**.  
Il utilise des *partials* (header/footer) pour faciliter la maintenance et l’uniformité des pages.

---

## 📂 Structure du projet
```
auformat/
│── index.html            # Page principale
│── comingsoon.html       # Page temporaire "Coming Soon"
│── partials/             # Blocs réutilisables (header, footer…)
│── sources/
│    ├── css/style.css    # Styles globaux
│    ├── img/             # Images et logos
│── js/
│    ├── include.js       # Script pour inclure les partials (header/footer)
│
└── README.md
```

---

## ⚙️ Installation et usage en local

### 1. Cloner le dépôt
```bash
git clone https://github.com/theblackhat17/auformat.git
cd auformat
```

### 2. Lancer un serveur local
Comme les partials sont chargés en `fetch()`, il faut utiliser un serveur HTTP (et non pas ouvrir `file://`).  
Deux options simples :

- **Python 3 (déjà présent sur macOS/Linux) :**
```bash
python3 -m http.server 5173
```
Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur.

- **Node.js avec serve :**
```bash
npx serve -l 5173 .
```

---

## 🚀 Déploiement sur Netlify
Le site est automatiquement déployé via **Netlify** à chaque `git push` sur la branche `main`.

1. **Connexion** : connecte ton repo GitHub sur Netlify.
2. **Build settings** :  
   - Build command : *(aucune, projet statique)*  
   - Publish directory : `/`
3. **Webhook GitHub Actions** : un workflow est configuré (`.github/workflows/netlify.yml`) pour déclencher un déploiement après chaque push.

---

✨ *Développé avec passion, bois et code !* 🌳⚒️
