/**
 * Script Node.js pour agréger tous les fichiers JSON générés par Netlify CMS
 * en fichiers API uniques pour faciliter le chargement
 * 
 * À exécuter automatiquement lors du build Netlify
 */

const fs = require('fs');
const path = require('path');

// Fonction pour lire tous les fichiers JSON d'un dossier
function readJSONFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.log(`📁 Le dossier ${dirPath} n'existe pas encore`);
        return [];
    }

    const files = fs.readdirSync(dirPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    return jsonFiles.map(file => {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    });
}

// Créer le dossier API s'il n'existe pas
if (!fs.existsSync('api')) {
    fs.mkdirSync('api', { recursive: true });
}

// Agréger les réalisations
console.log('📸 Agrégation des réalisations...');
const realisations = readJSONFiles('api/realisations');
fs.writeFileSync('api/realisations.json', JSON.stringify(realisations, null, 2));
console.log(`✅ ${realisations.length} réalisation(s) agrégée(s)`);

// Agréger les avis
console.log('⭐ Agrégation des avis...');
const avis = readJSONFiles('api/avis');
fs.writeFileSync('api/avis.json', JSON.stringify(avis, null, 2));
console.log(`✅ ${avis.length} avis agrégé(s)`);

// Agréger les matériaux
console.log('🌳 Agrégation des matériaux...');
const materiaux = readJSONFiles('api/materiaux');
fs.writeFileSync('api/materiaux.json', JSON.stringify(materiaux, null, 2));
console.log(`✅ ${materiaux.length} matériau(x) agrégé(s)`);

// Agréger l'équipe
console.log('👥 Agrégation de l\'équipe...');
const equipe = readJSONFiles('api/equipe');
fs.writeFileSync('api/equipe.json', JSON.stringify(equipe, null, 2));
console.log(`✅ ${equipe.length} membre(s) agrégé(s)`);

console.log('\n✨ Build API terminé avec succès!');
console.log('📊 Fichiers générés:');
console.log('  - api/realisations.json');
console.log('  - api/avis.json');
console.log('  - api/materiaux.json');
console.log('  - api/equipe.json');