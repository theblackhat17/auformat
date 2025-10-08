// ============================================
// VIEWER 3D AVEC THREE.JS
// Fichier: js/configurateur_3d.js
// ============================================

class Viewer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentMesh = null;
        this.hingeMeshes = [];
        this.holeMeshes = [];
        
        this.init();
        this.animate();
    }

    init() {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf7fafc);
        
        // Caméra
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(800, 600, 800);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Lumières
        this.setupLights();
        
        // Contrôles
        this.setupControls();
        
        // Grille et axes
        const gridHelper = new THREE.GridHelper(2000, 20, 0xe2e8f0, 0xf7fafc);
        this.scene.add(gridHelper);
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle principale
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(500, 800, 500);
        dirLight1.castShadow = true;
        dirLight1.shadow.mapSize.width = 2048;
        dirLight1.shadow.mapSize.height = 2048;
        dirLight1.shadow.camera.near = 100;
        dirLight1.shadow.camera.far = 2000;
        dirLight1.shadow.camera.left = -1000;
        dirLight1.shadow.camera.right = 1000;
        dirLight1.shadow.camera.top = 1000;
        dirLight1.shadow.camera.bottom = -1000;
        this.scene.add(dirLight1);
        
        // Lumière d'appoint
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight2.position.set(-500, 400, -500);
        this.scene.add(dirLight2);
        
        // Lumière de remplissage
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        this.scene.add(hemisphereLight);
    }

    setupControls() {
        // Note: OrbitControls doit être importé depuis CDN
        // <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 200;
        this.controls.maxDistance = 2000;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    createWoodMaterial(colorHex) {
        return new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
    }

    createMetalMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.3,
            metalness: 0.8
        });
    }

    updateBoard(config) {
        // Nettoyer l'ancienne géométrie
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
            this.currentMesh.material.dispose();
        }
        
        // Nettoyer les charnières
        this.hingeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.hingeMeshes = [];
        
        // Nettoyer les trous
        this.holeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.holeMeshes = [];
        
        // Créer la nouvelle planche
        const geometry = this.createBoardGeometry(config);
        const material = this.getMaterialForType(config.material);
        
        this.currentMesh = new THREE.Mesh(geometry, material);
        this.currentMesh.castShadow = true;
        this.currentMesh.receiveShadow = true;
        this.scene.add(this.currentMesh);
        
        // Ajouter les charnières si nécessaire
        if (config.hingeMachining) {
            this.addHinges(config);
        }
        
        // Ajouter les trous pour tablettes si nécessaire
        if (config.tabletHoles) {
            this.addTabletHoles(config);
        }
        
        // Centrer la caméra sur l'objet
        this.centerCamera(config);
    }

    createBoardGeometry(config) {
        const width = config.length;
        const height = config.width;
        const depth = config.thickness;
        
        // Créer une forme 2D pour l'extrusion
        const shape = this.createShape(config, width, height);
        
        // Paramètres d'extrusion
        const extrudeSettings = {
            depth: depth,
            bevelEnabled: false
        };
        
        // Créer la géométrie
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Centrer la géométrie
        geometry.translate(-width / 2, -height / 2, -depth / 2);
        
        return geometry;
    }

    createShape(config, width, height) {
        const shape = new THREE.Shape();
        const radius = 20; // Rayon pour les coins arrondis
        
        // Récupérer les coins
        const { tl, tr, br, bl } = config.corners;
        
        // Commencer en haut à gauche
        if (tl === 'round') {
            shape.moveTo(radius, 0);
        } else {
            shape.moveTo(0, 0);
        }
        
        // Ligne du haut
        if (tr === 'round') {
            shape.lineTo(width - radius, 0);
            shape.quadraticCurveTo(width, 0, width, radius);
        } else if (tr === 'bevel') {
            shape.lineTo(width - radius, 0);
            shape.lineTo(width, radius);
        } else {
            shape.lineTo(width, 0);
        }
        
        // Ligne de droite
        if (br === 'round') {
            shape.lineTo(width, height - radius);
            shape.quadraticCurveTo(width, height, width - radius, height);
        } else if (br === 'bevel') {
            shape.lineTo(width, height - radius);
            shape.lineTo(width - radius, height);
        } else {
            shape.lineTo(width, height);
        }
        
        // Ligne du bas
        if (bl === 'round') {
            shape.lineTo(radius, height);
            shape.quadraticCurveTo(0, height, 0, height - radius);
        } else if (bl === 'bevel') {
            shape.lineTo(radius, height);
            shape.lineTo(0, height - radius);
        } else {
            shape.lineTo(0, height);
        }
        
        // Ligne de gauche
        if (tl === 'round') {
            shape.lineTo(0, radius);
            shape.quadraticCurveTo(0, 0, radius, 0);
        } else if (tl === 'bevel') {
            shape.lineTo(0, radius);
            shape.lineTo(radius, 0);
        } else {
            shape.lineTo(0, 0);
        }
        
        return shape;
    }

    getMaterialForType(materialType) {
        const materials = {
            'epicea': 0xD4A574,
            'mdf': 0x8B7355,
            'contreplaque': 0xC19A6B,
            'osb': 0xB8956A,
            'agglomere': 0x9B8B7E
        };
        
        const color = materials[materialType] || 0xD4A574;
        return this.createWoodMaterial(color);
    }

    addHinges(config) {
        const width = config.length;
        const height = config.width;
        const depth = config.thickness;
        
        // Position des charnières (1/3 et 2/3 de la hauteur)
        const hingeY1 = -height / 3;
        const hingeY2 = height / 3;
        const hingeX = -width / 2;
        
        // Créer 2 charnières
        [hingeY1, hingeY2].forEach(yPos => {
            const hingeGroup = new THREE.Group();
            
            // Corps de la charnière
            const hingeBody = new THREE.BoxGeometry(15, 40, depth);
            const hingeMesh = new THREE.Mesh(hingeBody, this.createMetalMaterial());
            hingeMesh.position.set(hingeX - 7.5, yPos, 0);
            hingeMesh.castShadow = true;
            hingeGroup.add(hingeMesh);
            
            // Vis (3 trous)
            const screwGeometry = new THREE.CylinderGeometry(2.5, 2.5, depth + 2, 16);
            const screwMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
            
            [-12, 0, 12].forEach(offsetY => {
                const screw = new THREE.Mesh(screwGeometry, screwMaterial);
                screw.position.set(hingeX - 7.5, yPos + offsetY, 0);
                screw.rotation.x = Math.PI / 2;
                hingeGroup.add(screw);
            });
            
            this.scene.add(hingeGroup);
            this.hingeMeshes.push(hingeGroup);
        });
    }

    addTabletHoles(config) {
        const width = config.length;
        const height = config.width;
        const depth = config.thickness;
        
        const holeSpacing = 32; // Entraxe de 32mm
        const startMargin = 80; // Démarre à 80mm du bord
        const holeRadius = 4; // Diamètre 8mm = rayon 4mm
        const holeDepth = depth * 0.6; // Profondeur du trou
        
        const holeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B6F47,
            roughness: 0.9
        });
        
        // Trous sur le côté gauche
        const leftX = -width / 2 + 15;
        for (let y = -height / 2 + startMargin; y <= height / 2 - startMargin; y += holeSpacing) {
            const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 16);
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            hole.position.set(leftX, y, 0);
            hole.rotation.z = Math.PI / 2;
            this.scene.add(hole);
            this.holeMeshes.push(hole);
        }
        
        // Trous sur le côté droit
        const rightX = width / 2 - 15;
        for (let y = -height / 2 + startMargin; y <= height / 2 - startMargin; y += holeSpacing) {
            const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 16);
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            hole.position.set(rightX, y, 0);
            hole.rotation.z = Math.PI / 2;
            this.scene.add(hole);
            this.holeMeshes.push(hole);
        }
    }

    centerCamera(config) {
        const width = config.length;
        const height = config.width;
        const depth = config.thickness;
        
        // Calculer la distance optimale pour voir l'objet entier
        const maxDim = Math.max(width, height, depth);
        const distance = maxDim * 2;
        
        this.camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    // Méthode pour prendre un screenshot (pour le PDF)
    takeScreenshot() {
        return this.renderer.domElement.toDataURL('image/png');
    }
}

// Export pour utilisation
window.Viewer3D = Viewer3D;