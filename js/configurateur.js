
        // Configuration
        const furniture = {
            template: 'custom',
            width: 800,
            height: 720,
            depth: 580,
            thickness: 18,
            modules: []
        };

        const WOOD_COLOR = 0xD4A574;
        const WOOD_PRICE_M2 = 45;

        let scene, camera, renderer, controls;
        let cabinetGroup, modulesGroup;
        let isExploded = false;

        // Initialisation
        function init() {
            const container = document.getElementById('viewer-container');
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf7fafc);

            camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 10000);
            camera.position.set(1200, 1000, 1200);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Lumières
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight1.position.set(1000, 1500, 1000);
            dirLight1.castShadow = true;
            scene.add(dirLight1);

            const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
            dirLight2.position.set(-1000, 800, -1000);
            scene.add(dirLight2);

            // Sol
            const floorGeometry = new THREE.PlaneGeometry(5000, 5000);
            const floorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xe2e8f0, 
                roughness: 0.8 
            });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -10;
            floor.receiveShadow = true;
            scene.add(floor);

            // Grille
            const grid = new THREE.GridHelper(3000, 30, 0xcbd5e0, 0xe2e8f0);
            grid.position.y = -9;
            scene.add(grid);

            // Contrôles
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 500;
            controls.maxDistance = 3000;

            // Groupes
            cabinetGroup = new THREE.Group();
            scene.add(cabinetGroup);
            
            modulesGroup = new THREE.Group();
            scene.add(modulesGroup);

            // Build initial
            buildCabinet();
            updatePrice();

            animate();

            window.addEventListener('resize', onResize);
        }

        function createWoodMaterial() {
            return new THREE.MeshStandardMaterial({
                color: WOOD_COLOR,
                roughness: 0.7,
                metalness: 0.1
            });
        }

        function buildCabinet() {
            // Nettoyer
            while(cabinetGroup.children.length > 0) {
                const child = cabinetGroup.children[0];
                cabinetGroup.remove(child);
                child.geometry.dispose();
                child.material.dispose();
            }

            const w = furniture.width;
            const h = furniture.height;
            const d = furniture.depth;
            const t = furniture.thickness;

            const material = createWoodMaterial();

            // Fond
            const back = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, t),
                material
            );
            back.position.set(0, h/2, -d/2);
            back.castShadow = true;
            back.receiveShadow = true;
            cabinetGroup.add(back);

            // Côtés
            const left = new THREE.Mesh(
                new THREE.BoxGeometry(t, h, d),
                material
            );
            left.position.set(-w/2 + t/2, h/2, 0);
            left.castShadow = true;
            cabinetGroup.add(left);

            const right = left.clone();
            right.position.set(w/2 - t/2, h/2, 0);
            cabinetGroup.add(right);

            // Dessus
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(w, t, d),
                material
            );
            top.position.set(0, h - t/2, 0);
            top.castShadow = true;
            cabinetGroup.add(top);

            // Dessous
            const bottom = top.clone();
            bottom.position.set(0, t/2, 0);
            cabinetGroup.add(bottom);

            // Centrer
            camera.lookAt(0, h/2, 0);
            controls.target.set(0, h/2, 0);
        }

        function addModule(type) {
            const id = Date.now();
            const w = furniture.width;
            const h = furniture.height;
            const d = furniture.depth;
            
            let module = {
                id,
                type,
                width: w - furniture.thickness * 2 - 20,
                height: type === 'drawer' ? 150 : h / 2,
                depth: furniture.thickness,
                position: furniture.modules.length * (type === 'drawer' ? 160 : h/2 + 20)
            };

            furniture.modules.push(module);
            buildModule(module);
            updateModuleList();
            updatePrice();
        }

        function buildModule(module) {
            const material = new THREE.MeshStandardMaterial({
                color: 0xB8956A,
                roughness: 0.6,
                metalness: 0.2
            });

            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(module.width, module.height, module.depth),
                material
            );
            
            mesh.position.set(
                0,
                module.position + module.height/2,
                furniture.depth/2 + 5
            );
            
            mesh.castShadow = true;
            mesh.userData.moduleId = module.id;
            modulesGroup.add(mesh);

            // Poignée
            if(module.type === 'door' || module.type === 'drawer') {
                const handle = new THREE.Mesh(
                    new THREE.BoxGeometry(100, 20, 20),
                    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 })
                );
                handle.position.set(
                    module.width/3,
                    module.position + module.height/2,
                    furniture.depth/2 + 15
                );
                modulesGroup.add(handle);
            }
        }

        function removeModule(id) {
            furniture.modules = furniture.modules.filter(m => m.id !== id);
            
            // Supprimer du rendu
            modulesGroup.children = modulesGroup.children.filter(child => {
                if(child.userData.moduleId === id) {
                    child.geometry.dispose();
                    child.material.dispose();
                    return false;
                }
                return true;
            });

            updateModuleList();
            updatePrice();
        }

        function updateModuleList() {
            const list = document.getElementById('module-list');
            const icons = { door: '🚪', drawer: '📦', shelf: '📐' };
            const labels = { door: 'Porte', drawer: 'Tiroir', shelf: 'Étagère' };

            list.innerHTML = furniture.modules.map(m => `
                <div class="module-item">
                    <div class="module-info">
                        <div class="module-name">${icons[m.type]} ${labels[m.type]}</div>
                        <div class="module-dims">${m.width} × ${m.height} mm</div>
                    </div>
                    <div class="module-actions">
                        <button class="icon-btn" onclick="removeModule(${m.id})">🗑️</button>
                    </div>
                </div>
            `).join('');

            document.getElementById('module-count').textContent = furniture.modules.length;
        }

        function updateCabinet() {
            furniture.width = parseInt(document.getElementById('width').value);
            furniture.height = parseInt(document.getElementById('height').value);
            furniture.depth = parseInt(document.getElementById('depth').value);
            furniture.thickness = parseInt(document.getElementById('thickness').value);
            
            buildCabinet();
            
            // Rebuild modules
            while(modulesGroup.children.length > 0) {
                const child = modulesGroup.children[0];
                modulesGroup.remove(child);
                child.geometry.dispose();
                child.material.dispose();
            }
            
            furniture.modules.forEach(m => buildModule(m));
            updatePrice();
        }

        function updatePrice() {
            const w = furniture.width / 1000;
            const h = furniture.height / 1000;
            const d = furniture.depth / 1000;
            const t = furniture.thickness / 1000;

            // Surface caisson
            const cabinetSurface = (w * h * 2) + (h * d * 2) + (w * d * 2);
            const cabinetPrice = cabinetSurface * WOOD_PRICE_M2;

            // Prix modules
            let modulesPrice = 0;
            furniture.modules.forEach(m => {
                const mw = m.width / 1000;
                const mh = m.height / 1000;
                modulesPrice += mw * mh * WOOD_PRICE_M2 * 1.5;
            });

            const hardwarePrice = 35 + (furniture.modules.length * 15);
            const subtotal = cabinetPrice + modulesPrice + hardwarePrice;
            const tva = subtotal * 0.2;
            const total = subtotal + tva;

            document.getElementById('price-cabinet').textContent = cabinetPrice.toFixed(2) + ' €';
            document.getElementById('price-modules').textContent = modulesPrice.toFixed(2) + ' €';
            document.getElementById('price-hardware').textContent = hardwarePrice.toFixed(2) + ' €';
            document.getElementById('total-price').textContent = total.toFixed(2) + ' €';
        }

        function selectTemplate(template) {
            document.querySelectorAll('.template-card').forEach(el => {
                el.classList.toggle('active', el.onclick.toString().includes(template));
            });

            furniture.template = template;

            // Appliquer dimensions template
            if(template === 'kitchen-base') {
                document.getElementById('width').value = 800;
                document.getElementById('height').value = 720;
                document.getElementById('depth').value = 580;
            } else if(template === 'kitchen-high') {
                document.getElementById('width').value = 600;
                document.getElementById('height').value = 720;
                document.getElementById('depth').value = 350;
            } else if(template === 'wardrobe') {
                document.getElementById('width').value = 1200;
                document.getElementById('height').value = 2200;
                document.getElementById('depth').value = 600;
            }

            updateCabinet();
        }

        function resetView() {
            const maxDim = Math.max(furniture.width, furniture.height, furniture.depth);
            camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
            controls.target.set(0, furniture.height/2, 0);
            controls.update();
        }

        function changeView(view) {
            const h = furniture.height / 2;
            const maxDim = Math.max(furniture.width, furniture.height, furniture.depth);

            if(view === 'front') {
                camera.position.set(0, h, maxDim * 1.5);
            } else if(view === 'side') {
                camera.position.set(maxDim * 1.5, h, 0);
            } else if(view === 'top') {
                camera.position.set(0, maxDim * 2, 0);
            }

            controls.target.set(0, h, 0);
            controls.update();
        }

        function toggleWireframe() {
            cabinetGroup.children.forEach(child => {
                if(child.material) child.material.wireframe = !child.material.wireframe;
            });
            modulesGroup.children.forEach(child => {
                if(child.material) child.material.wireframe = !child.material.wireframe;
            });
        }

        function explodeView() {
            isExploded = !isExploded;
            const offset = isExploded ? 200 : 0;

            modulesGroup.children.forEach((child, i) => {
                child.position.z = furniture.depth/2 + 5 + (i * offset / 5);
            });
        }

        // Dans /js/configurateur.js
// Remplacez la fonction saveFurniture() existante (lignes ~330-333) par celle-ci :

async function saveFurniture() {
    try {
        // Vérifier si l'utilisateur est connecté
        const user = await AUTH.getCurrentUser();
        
        if (!user) {
            // Si non connecté, proposer de se connecter
            if (confirm('⚠️ Connectez-vous pour sauvegarder votre projet de manière permanente.\n\nVoulez-vous vous connecter maintenant ?')) {
                // Sauvegarder temporairement dans localStorage
                localStorage.setItem('unsaved-furniture', JSON.stringify(furniture));
                window.location.href = '/login.html?redirect=/configurateur.html';
            } else {
                // Sauvegarde locale uniquement
                localStorage.setItem('furnitureConfig', JSON.stringify(furniture));
                alert('💾 Sauvegardé localement dans votre navigateur (temporaire)\n\nConnectez-vous pour une sauvegarde permanente.');
            }
            return;
        }

        // Demander le nom du projet
        const projectName = prompt('📝 Donnez un nom à votre projet :', `Meuble ${furniture.template || 'personnalisé'}`);
        if (!projectName || projectName.trim() === '') {
            alert('❌ Nom requis pour sauvegarder');
            return;
        }

        // Préparer les données du projet
        const projectData = {
            user_id: user.id,
            name: projectName.trim(),
            type: furniture.template || 'custom',
            config: furniture, // Toute la configuration du meuble
            status: 'draft',
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Sauvegarder dans Supabase
        const { data, error } = await supabaseClient
            .from('projects')
            .insert([projectData])
            .select()
            .single();

        if (error) throw error;

        // Succès
        alert(`✅ Projet "${projectName}" sauvegardé avec succès !\n\n📊 Résumé :\n- Dimensions : ${furniture.width}×${furniture.height}×${furniture.depth} mm\n- Modules : ${furniture.modules.length}\n\n📂 Retrouvez-le dans "Mes Projets"`);
        
        // Proposer de voir tous les projets
        if (confirm('Voulez-vous voir tous vos projets maintenant ?')) {
            window.location.href = '/mes_projets.html';
        }

    } catch (error) {
        console.error('Erreur sauvegarde projet:', error);
        alert('❌ Erreur lors de la sauvegarde : ' + error.message + '\n\n💾 Sauvegarde locale effectuée en secours.');
        
        // Fallback : sauvegarde locale
        localStorage.setItem('furnitureConfig', JSON.stringify(furniture));
    }
}

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }

        function onResize() {
            const container = document.getElementById('viewer-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        // Fonction pour charger un projet depuis l'URL
        async function loadProjectFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('project');
            
            if (!projectId) {
                // Vérifier s'il y a un projet non sauvegardé dans localStorage
                const unsaved = localStorage.getItem('unsaved-furniture');
                if (unsaved) {
                    if (confirm('📦 Un projet non sauvegardé a été trouvé. Voulez-vous le restaurer ?')) {
                        try {
                            const loadedFurniture = JSON.parse(unsaved);
                            Object.assign(furniture, loadedFurniture);
                            localStorage.removeItem('unsaved-furniture');
                            updateCabinet();
                            furniture.modules.forEach(m => buildModule(m));
                            updateModuleList();
                            updatePrice();
                            alert('✅ Projet restauré !');
                        } catch (e) {
                            console.error('Erreur restauration:', e);
                        }
                    }
                }
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();

                if (error) throw error;

                // Charger la configuration
                const loadedConfig = data.config;
                Object.assign(furniture, loadedConfig);
                
                // Mettre à jour les inputs
                document.getElementById('width').value = furniture.width;
                document.getElementById('height').value = furniture.height;
                document.getElementById('depth').value = furniture.depth;
                document.getElementById('thickness').value = furniture.thickness;
                
                // Rebuild le meuble
                updateCabinet();
                furniture.modules.forEach(m => buildModule(m));
                updateModuleList();
                updatePrice();
                
                alert(`✅ Projet "${data.name}" chargé !`);

            } catch (error) {
                console.error('Erreur chargement projet:', error);
                alert('❌ Impossible de charger le projet : ' + error.message);
            }
        }

        // Appeler au chargement de la page
        window.addEventListener('load', () => {
            // Attendre un peu que AUTH soit initialisé
            setTimeout(loadProjectFromUrl, 500);
        });

        init();