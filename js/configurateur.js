// 🚀 CONFIGURATEUR MODULAIRE AVANCÉ - Au Format
// Version finale avec Drag & Drop

// ============================================
// CONFIGURATION GLOBALE
// ============================================

const CONFIG = {
    WOOD_MATERIALS: {
        chene: { name: 'Chêne', color: 0xD4A574, price: 45, texture: 'oak' },
        noyer: { name: 'Noyer', color: 0x8B5A3C, price: 55, texture: 'walnut' },
        pin: { name: 'Pin', color: 0xE8D4B0, price: 35, texture: 'pine' },
        blanc: { name: 'Blanc', color: 0xF5F5F5, price: 40, texture: 'white' },
        noir: { name: 'Noir', color: 0x2D2D2D, price: 42, texture: 'black' }
    },
    
    MODULES_CATALOG: {
        etagere: { name: 'Étagère', icon: '📚', basePrice: 15, height: 18 },
        tiroir: { name: 'Tiroir', icon: '🗄️', basePrice: 45, height: 150 },
        penderie: { name: 'Penderie', icon: '👔', basePrice: 35, height: 1200 },
        niche: { name: 'Niche', icon: '📦', basePrice: 0, height: 300 },
        porte: { name: 'Porte', icon: '🚪', basePrice: 80, width: 400 }
    },

    HANDLES: {
        moderne: { name: 'Moderne', icon: '━', price: 8, model: 'bar' },
        bouton: { name: 'Bouton', icon: '◉', price: 6, model: 'knob' },
        coquille: { name: 'Coquille', icon: '⌒', price: 10, model: 'shell' },
        invisible: { name: 'Invisible', icon: '⬜', price: 12, model: 'push' }
    }
};

// ============================================
// ÉTAT DU MEUBLE
// ============================================

const furniture = {
    template: 'custom',
    material: 'chene',
    name: 'Mon Meuble',
    cabinets: [
        {
            id: 1,
            width: 800,
            height: 2200,
            depth: 600,
            thickness: 18,
            position: { x: 0, y: 0, z: 0 },
            modules: []
        }
    ],
    globalHandle: 'moderne',
    showDimensions: true,
    exploded: false
};

// ============================================
// VARIABLES THREE.JS
// ============================================

let scene, camera, renderer, controls;
let mainGroup;
let selectedModule = null;
let raycaster, mouse;

// Drag & Drop
let isDragging = false;
let draggedModule = null;
let dragStartY = 0;
let dragGhost = null;
let snapIndicator = null;

// ============================================
// INITIALISATION
// ============================================

function init() {
    const container = document.getElementById('viewer-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xf0f4f8, 3000, 5000);
    
    camera = new THREE.PerspectiveCamera(
        45, 
        container.clientWidth / container.clientHeight, 
        1, 
        10000
    );
    camera.position.set(2000, 1500, 2000);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    setupLights();
    setupEnvironment();
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 800;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI / 2;
    
    mainGroup = new THREE.Group();
    scene.add(mainGroup);
    
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Events
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('mousemove', onCanvasHover);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    
    rebuildAll();
    updateUI();
    animate();
    
    console.log('✅ Configurateur modulaire initialisé');
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(1500, 2000, 1000);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -2000;
    sunLight.shadow.camera.right = 2000;
    sunLight.shadow.camera.top = 2000;
    sunLight.shadow.camera.bottom = -2000;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    const fillLight1 = new THREE.DirectionalLight(0xb3d9ff, 0.3);
    fillLight1.position.set(-1000, 1000, -1000);
    scene.add(fillLight1);
    
    const fillLight2 = new THREE.DirectionalLight(0xfff4e6, 0.2);
    fillLight2.position.set(1000, 500, -1000);
    scene.add(fillLight2);
}

function setupEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(8000, 8000);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xecf0f3,
        roughness: 0.9,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    floor.receiveShadow = true;
    scene.add(floor);
    
    const grid = new THREE.GridHelper(6000, 60, 0xc5d3e0, 0xe0e7ee);
    grid.position.y = -9;
    scene.add(grid);
}

// ============================================
// CONSTRUCTION DU MEUBLE
// ============================================

function rebuildAll() {
    while(mainGroup.children.length > 0) {
        const child = mainGroup.children[0];
        mainGroup.remove(child);
        if(child.geometry) child.geometry.dispose();
        if(child.material) {
            if(Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    }
    
    furniture.cabinets.forEach((cabinet, index) => {
        buildCabinet(cabinet, index);
    });
    
    centerCamera();
}

function buildCabinet(cabinet, index) {
    const group = new THREE.Group();
    group.userData.cabinetId = cabinet.id;
    
    const w = cabinet.width;
    const h = cabinet.height;
    const d = cabinet.depth;
    const t = cabinet.thickness;
    
    const material = createWoodMaterial();
    
    // Structure
    const back = createPanel(w, h, t, material);
    back.position.set(0, h/2, -d/2);
    group.add(back);
    
    const left = createPanel(t, h, d, material);
    left.position.set(-w/2 + t/2, h/2, 0);
    group.add(left);
    
    const right = left.clone();
    right.position.set(w/2 - t/2, h/2, 0);
    group.add(right);
    
    const top = createPanel(w, t, d, material);
    top.position.set(0, h - t/2, 0);
    group.add(top);
    
    const bottom = top.clone();
    bottom.position.set(0, t/2, 0);
    group.add(bottom);
    
    // Modules
    cabinet.modules.forEach(module => {
        buildModule(module, cabinet, group);
    });
    
    group.position.set(cabinet.position.x, cabinet.position.y, cabinet.position.z);
    mainGroup.add(group);
}

function createPanel(width, height, depth, material) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 1 });
    const line = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(line);
    
    return mesh;
}

function buildModule(module, cabinet, parentGroup) {
    const mat = CONFIG.WOOD_MATERIALS[furniture.material];
    const moduleMaterial = new THREE.MeshStandardMaterial({
        color: mat.color * 0.9,
        roughness: 0.6,
        metalness: 0.1
    });
    
    const w = cabinet.width - cabinet.thickness * 2 - 10;
    const d = cabinet.depth - cabinet.thickness - 10;
    
    switch(module.type) {
        case 'etagere':
            const shelf = createPanel(w, 18, d, moduleMaterial);
            shelf.position.set(0, module.position, d/2 - cabinet.depth/2 + 5);
            shelf.userData.moduleData = module;
            parentGroup.add(shelf);
            break;
            
        case 'tiroir':
            const drawerHeight = module.height || 150;
            const drawer = createPanel(w, drawerHeight, d, moduleMaterial);
            drawer.position.set(0, module.position + drawerHeight/2, cabinet.depth/2 + 2);
            drawer.userData.moduleData = module;
            parentGroup.add(drawer);
            addHandle(drawer, module, cabinet);
            break;
            
        case 'penderie':
            const rodRadius = 15;
            const rodLength = w - 100;
            const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 16);
            const rodMat = new THREE.MeshStandardMaterial({ 
                color: 0xcccccc, 
                metalness: 0.8, 
                roughness: 0.2 
            });
            const rod = new THREE.Mesh(rodGeo, rodMat);
            rod.rotation.z = Math.PI / 2;
            rod.position.set(0, module.position, 0);
            rod.userData.moduleData = module;
            parentGroup.add(rod);
            break;
            
        case 'porte':
            const doorWidth = module.width || w;
            const doorHeight = module.height || cabinet.height - 36;
            const door = createPanel(doorWidth, doorHeight, 18, moduleMaterial);
            door.position.set(
                module.offsetX || 0, 
                doorHeight/2 + 18, 
                cabinet.depth/2 + 10
            );
            door.userData.moduleData = module;
            parentGroup.add(door);
            addHandle(door, module, cabinet);
            break;
    }
}

function addHandle(parent, module, cabinet) {
    const handleType = CONFIG.HANDLES[furniture.globalHandle];
    
    const handleGeo = new THREE.BoxGeometry(100, 15, 15);
    const handleMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.9,
        roughness: 0.1
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(parent.geometry.parameters.width/3, 0, 20);
    parent.add(handle);
}

function createWoodMaterial() {
    const mat = CONFIG.WOOD_MATERIALS[furniture.material];
    return new THREE.MeshStandardMaterial({
        color: mat.color,
        roughness: 0.7,
        metalness: 0.05,
        flatShading: false
    });
}

// ============================================
// GESTION DES CAISSONS
// ============================================

function addCabinet() {
    const newId = Math.max(...furniture.cabinets.map(c => c.id)) + 1;
    const lastCabinet = furniture.cabinets[furniture.cabinets.length - 1];
    
    const newCabinet = {
        id: newId,
        width: 800,
        height: lastCabinet.height,
        depth: lastCabinet.depth,
        thickness: 18,
        position: { 
            x: lastCabinet.position.x + lastCabinet.width, 
            y: 0, 
            z: 0 
        },
        modules: []
    };
    
    furniture.cabinets.push(newCabinet);
    rebuildAll();
    updateUI();
}

function removeCabinet(id) {
    if(furniture.cabinets.length <= 1) {
        alert('⚠️ Vous devez avoir au moins un caisson');
        return;
    }
    
    furniture.cabinets = furniture.cabinets.filter(c => c.id !== id);
    rebuildAll();
    updateUI();
}

// ============================================
// GESTION DES MODULES
// ============================================

function addModuleToActiveCabinet(type) {
    const activeCabinetId = parseInt(document.getElementById('active-cabinet-select')?.value || 1);
    const cabinet = furniture.cabinets.find(c => c.id === activeCabinetId);
    
    if(!cabinet) return;
    
    const newModule = {
        id: Date.now(),
        type: type,
        position: calculateNextModulePosition(cabinet),
        width: cabinet.width - cabinet.thickness * 2 - 10,
        height: CONFIG.MODULES_CATALOG[type].height
    };
    
    cabinet.modules.push(newModule);
    rebuildAll();
    updateUI();
}

function calculateNextModulePosition(cabinet) {
    if(cabinet.modules.length === 0) {
        return cabinet.thickness + 50;
    }
    
    const lastModule = cabinet.modules[cabinet.modules.length - 1];
    return lastModule.position + (lastModule.height || 200) + 20;
}

function removeModule(cabinetId, moduleId) {
    const cabinet = furniture.cabinets.find(c => c.id === cabinetId);
    if(!cabinet) return;
    
    cabinet.modules = cabinet.modules.filter(m => m.id !== moduleId);
    rebuildAll();
    updateUI();
}

// ============================================
// DRAG & DROP - SYSTÈME COMPLET
// ============================================

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(mainGroup.children, true);
    
    if(intersects.length > 0) {
        const object = intersects[0].object;
        if(object.userData.moduleData) {
            selectModule(object);
        }
    }
}

function onCanvasHover(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(mainGroup.children, true);
    
    const hasModule = intersects.length > 0 && intersects[0].object.userData.moduleData;
    renderer.domElement.style.cursor = hasModule ? 'grab' : 'default';
}

function selectModule(object) {
    if(selectedModule && selectedModule.material) {
        selectedModule.material.emissive.setHex(0x000000);
    }
    
    selectedModule = object;
    if(selectedModule.material) {
        selectedModule.material.emissive.setHex(0x444444);
    }
    
    console.log('✅ Module sélectionné:', object.userData.moduleData);
    showModuleInfo(object.userData.moduleData);
}

// MOUSEDOWN
function onMouseDown(event) {
    if(event.button !== 0) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(mainGroup.children, true);
    
    if(intersects.length > 0) {
        const object = intersects[0].object;
        if(object.userData.moduleData) {
            startDragging(object, event.clientY);
        }
    }
}

function startDragging(object, clientY) {
    isDragging = true;
    draggedModule = object;
    dragStartY = clientY;
    
    controls.enabled = false;
    createDragGhost(object);
    createSnapIndicator();
    
    renderer.domElement.style.cursor = 'grabbing';
    document.body.classList.add('dragging');
    
    if(draggedModule.material) {
        draggedModule.material.opacity = 0.5;
        draggedModule.material.transparent = true;
    }
    
    console.log('🎯 Début du drag:', draggedModule.userData.moduleData);
}

function createDragGhost(object) {
    const ghostMaterial = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.3,
        wireframe: false
    });
    
    dragGhost = new THREE.Mesh(object.geometry.clone(), ghostMaterial);
    dragGhost.position.copy(object.position);
    dragGhost.rotation.copy(object.rotation);
    scene.add(dragGhost);
}

function createSnapIndicator() {
    const geometry = new THREE.PlaneGeometry(1500, 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    snapIndicator = new THREE.Mesh(geometry, material);
    snapIndicator.visible = false;
    scene.add(snapIndicator);
}

// MOUSEMOVE
function onMouseMove(event) {
    if(!isDragging || !draggedModule) return;
    
    const deltaY = event.clientY - dragStartY;
    const moduleData = draggedModule.userData.moduleData;
    
    const cabinet = furniture.cabinets.find(c => 
        c.modules.some(m => m.id === moduleData.id)
    );
    
    if(!cabinet) return;
    
    const sensitivity = 2;
    const newPosition = moduleData.position - (deltaY * sensitivity);
    
    const minPos = cabinet.thickness + 50;
    const maxPos = cabinet.height - cabinet.thickness - 100;
    const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));
    
    const snapGrid = 50;
    const snappedPosition = Math.round(clampedPosition / snapGrid) * snapGrid;
    
    if(dragGhost) {
        dragGhost.position.y = snappedPosition;
        
        if(snapIndicator) {
            snapIndicator.visible = true;
            snapIndicator.position.set(
                dragGhost.position.x,
                snappedPosition,
                dragGhost.position.z
            );
        }
    }
    
    const isValidPosition = checkPositionValidity(cabinet, moduleData.id, snappedPosition);
    if(dragGhost && dragGhost.material) {
        dragGhost.material.color.setHex(isValidPosition ? 0x4ade80 : 0xef4444);
    }
}

function checkPositionValidity(cabinet, moduleId, newPosition) {
    const moduleHeight = 150;
    
    for(const module of cabinet.modules) {
        if(module.id === moduleId) continue;
        
        const otherTop = module.position + (module.height || 150);
        const otherBottom = module.position;
        const newTop = newPosition + moduleHeight;
        const newBottom = newPosition;
        
        if(!(newTop < otherBottom || newBottom > otherTop)) {
            return false;
        }
    }
    
    return true;
}

// MOUSEUP
function onMouseUp(event) {
    if(!isDragging || !draggedModule) return;
    
    const moduleData = draggedModule.userData.moduleData;
    
    const cabinet = furniture.cabinets.find(c => 
        c.modules.some(m => m.id === moduleData.id)
    );
    
    if(cabinet && dragGhost) {
        const newPosition = dragGhost.position.y;
        
        if(checkPositionValidity(cabinet, moduleData.id, newPosition)) {
            const module = cabinet.modules.find(m => m.id === moduleData.id);
            if(module) {
                module.position = newPosition;
                console.log('✅ Module déplacé à:', newPosition);
            }
        } else {
            console.warn('⚠️ Position invalide, annulation');
        }
    }
    
    endDragging();
    rebuildAll();
    updateUI();
}

function endDragging() {
    isDragging = false;
    controls.enabled = true;
    document.body.classList.remove('dragging');
    
    if(draggedModule && draggedModule.material) {
        draggedModule.material.opacity = 1;
        draggedModule.material.transparent = false;
    }
    
    if(dragGhost) {
        scene.remove(dragGhost);
        dragGhost.geometry.dispose();
        dragGhost.material.dispose();
        dragGhost = null;
    }
    
    if(snapIndicator) {
        snapIndicator.visible = false;
    }
    
    renderer.domElement.style.cursor = 'default';
    draggedModule = null;
}

// ============================================
// UI - INFO MODULE
// ============================================

function showModuleInfo(moduleData) {
    const infoPanel = document.getElementById('module-info-panel');
    if(infoPanel) {
        infoPanel.innerHTML = `
            <strong>${CONFIG.MODULES_CATALOG[moduleData.type].name}</strong><br>
            <span style="font-size: 12px; color: #64748b;">Position: ${moduleData.position} mm</span><br>
            <button class="btn btn-small" onclick="deleteSelectedModule()" style="margin-top: 10px; width: 100%;">
                🗑️ Supprimer
            </button>
        `;
        infoPanel.style.display = 'block';
    }
}

function deleteSelectedModule() {
    if(!selectedModule || !selectedModule.userData.moduleData) return;
    
    const moduleData = selectedModule.userData.moduleData;
    
    furniture.cabinets.forEach(cabinet => {
        cabinet.modules = cabinet.modules.filter(m => m.id !== moduleData.id);
    });
    
    selectedModule = null;
    document.getElementById('module-info-panel').style.display = 'none';
    rebuildAll();
    updateUI();
}

// ============================================
// UI & PRIX
// ============================================

function updateUI() {
    updateCabinetsList();
    updateModulesList();
    updatePrice();
    updateStats();
}

function updateCabinetsList() {
    const container = document.getElementById('cabinets-list');
    if(!container) return;
    
    container.innerHTML = furniture.cabinets.map(cab => `
        <div class="cabinet-item">
            <div class="cabinet-info">
                <strong>Caisson ${cab.id}</strong>
                <span>${cab.width}×${cab.height}×${cab.depth} mm</span>
                <span>${cab.modules.length} modules</span>
            </div>
            <div class="cabinet-actions">
                <button class="btn btn-small" onclick="removeCabinet(${cab.id})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    // Update selector
    const select = document.getElementById('active-cabinet-select');
    if(select) {
        select.innerHTML = furniture.cabinets.map(c => 
            `<option value="${c.id}">Caisson ${c.id}</option>`
        ).join('');
    }
    
    document.getElementById('cabinets-count').textContent = furniture.cabinets.length;
}

function updateModulesList() {
    const activeCabinetId = parseInt(document.getElementById('active-cabinet-select')?.value || 1);
    const cabinet = furniture.cabinets.find(c => c.id === activeCabinetId);
    
    const container = document.getElementById('module-list');
    if(!container || !cabinet) return;
    
    const icons = { 
        etagere: '📚', 
        tiroir: '🗄️', 
        penderie: '👔', 
        porte: '🚪',
        niche: '📦' 
    };
    
    container.innerHTML = cabinet.modules.length === 0
        ? '<p style="text-align:center;color:#999;padding:20px;">Aucun module<br><small>Cliquez sur un module ci-dessus pour l\'ajouter</small></p>'
        : cabinet.modules.map(m => `
            <div class="module-item">
                <div class="module-info">
                    <div class="module-name">${icons[m.type]} ${CONFIG.MODULES_CATALOG[m.type].name}</div>
                    <div class="module-dims">Position: ${m.position} mm</div>
                </div>
                <div class="module-actions">
                    <button class="icon-btn" onclick="removeModule(${cabinet.id}, ${m.id})">🗑️</button>
                </div>
            </div>
        `).join('');
}

function updatePrice() {
    let totalPrice = 0;
    
    furniture.cabinets.forEach(cabinet => {
        const w = cabinet.width / 1000;
        const h = cabinet.height / 1000;
        const d = cabinet.depth / 1000;
        
        const surface = (w*h*2) + (h*d*2) + (w*d*2);
        const mat = CONFIG.WOOD_MATERIALS[furniture.material];
        totalPrice += surface * mat.price;
        
        cabinet.modules.forEach(module => {
            totalPrice += CONFIG.MODULES_CATALOG[module.type].basePrice;
        });
    });
    
    const hardwarePrice = 50;
    totalPrice += hardwarePrice;
    
    const tva = totalPrice * 0.2;
    const ttc = totalPrice + tva;
    
    document.getElementById('total-price').textContent = ttc.toFixed(2) + ' €';
    document.getElementById('price-material').textContent = (totalPrice - hardwarePrice - furniture.cabinets.reduce((sum, c) => sum + c.modules.length * 30, 0)).toFixed(2) + ' €';
    document.getElementById('price-modules').textContent = furniture.cabinets.reduce((sum, c) => sum + c.modules.reduce((s, m) => s + CONFIG.MODULES_CATALOG[m.type].basePrice, 0), 0).toFixed(2) + ' €';
}

function updateStats() {
    const totalModules = furniture.cabinets.reduce((sum, c) => sum + c.modules.length, 0);
    const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
    const avgHeight = furniture.cabinets.reduce((sum, c) => sum + c.height, 0) / furniture.cabinets.length;
    const volume = furniture.cabinets.reduce((sum, c) => {
        return sum + (c.width * c.height * c.depth) / 1000000;
    }, 0);
    
    document.getElementById('stat-cabinets').textContent = furniture.cabinets.length;
    document.getElementById('stat-modules').textContent = totalModules;
    document.getElementById('stat-width').textContent = totalWidth;
    document.getElementById('stat-volume').textContent = Math.round(volume);
}

// ============================================
// VUES & ANIMATIONS
// ============================================

function centerCamera() {
    const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
    const maxHeight = Math.max(...furniture.cabinets.map(c => c.height));
    
    controls.target.set(totalWidth / 2, maxHeight / 2, 0);
    
    const maxDim = Math.max(totalWidth, maxHeight);
    camera.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.8);
    controls.update();
}

function resetView() {
    centerCamera();
}

function changeView(view) {
    const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
    const maxHeight = Math.max(...furniture.cabinets.map(c => c.height)); // ✅ Corrigé
    const maxDim = Math.max(totalWidth, maxHeight, 1000);
    
    const target = new THREE.Vector3(totalWidth / 2, maxHeight / 2, 0);
    
    switch(view) {
        case 'front':
            camera.position.set(totalWidth / 2, maxHeight / 2, maxDim * 1.5);
            break;
        case 'side':
            camera.position.set(maxDim * 1.5, maxHeight / 2, 0);
            break;
        case 'top':
            camera.position.set(totalWidth / 2, maxDim * 2, 0);
            break;
    }
    
    controls.target.copy(target);
    controls.update();
}

function toggleWireframe() {
    mainGroup.traverse(child => {
        if(child.material && !child.userData.isEdge) {
            child.material.wireframe = !child.material.wireframe;
        }
    });
}

function explodeView() {
    furniture.exploded = !furniture.exploded;
    rebuildAll();
}

// ============================================
// SAUVEGARDE
// ============================================

async function saveFurniture() {
    try {
        const user = await AUTH.getCurrentUser();
        
        if (!user) {
            if (confirm('⚠️ Connectez-vous pour sauvegarder.\n\nVoulez-vous vous connecter ?')) {
                localStorage.setItem('unsaved-furniture', JSON.stringify(furniture));
                window.location.href = '/login.html?redirect=/configurateur.html';
            }
            return;
        }

        const projectName = prompt('📝 Nom du projet :', furniture.name || 'Mon Dressing');
        if (!projectName) return;

        const projectData = {
            user_id: user.id,
            name: projectName.trim(),
            type: furniture.template,
            config: furniture,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('projects')
            .insert([projectData])
            .select()
            .single();

        if (error) throw error;

        alert(`✅ Projet "${projectName}" sauvegardé !`);
        
        if (confirm('Voir tous vos projets ?')) {
            window.location.href = '/mes-projets.html';
        }

    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur : ' + error.message);
    }
}

// ============================================
// EXPORT & IMPORT
// ============================================

function exportConfiguration() {
    const config = {
        version: '2.0',
        furniture: furniture,
        timestamp: new Date().toISOString()
    };
    
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `meuble-${Date.now()}.json`;
    a.click();
    
    console.log('📥 Configuration exportée');
}

// ============================================
// TEMPLATES
// ============================================

function selectTemplate(template) {
    furniture.template = template;
    furniture.cabinets = [];
    
    switch(template) {
        case 'wardrobe':
            furniture.cabinets = [
                { id: 1, width: 1000, height: 2400, depth: 600, thickness: 18, position: {x: 0, y: 0, z: 0}, modules: [] },
                { id: 2, width: 800, height: 2400, depth: 600, thickness: 18, position: {x: 1000, y: 0, z: 0}, modules: [] },
                { id: 3, width: 1000, height: 2400, depth: 600, thickness: 18, position: {x: 1800, y: 0, z: 0}, modules: [] }
            ];
            break;
            
        case 'kitchen-base':
            furniture.cabinets = [
                { id: 1, width: 800, height: 720, depth: 580, thickness: 18, position: {x: 0, y: 0, z: 0}, modules: [] }
            ];
            break;
            
        default:
            furniture.cabinets = [
                { id: 1, width: 800, height: 720, depth: 580, thickness: 18, position: {x: 0, y: 0, z: 0}, modules: [] }
            ];
    }
    
    rebuildAll();
    updateUI();
}

// ============================================
// ANIMATION & RESIZE
// ============================================

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

// ============================================
// INITIALISATION AUTO
// ============================================

if(typeof THREE !== 'undefined') {
    window.addEventListener('load', init);
} else {
    console.error('❌ Three.js non chargé');
}

// Export des fonctions globales
window.addCabinet = addCabinet;
window.removeCabinet = removeCabinet;
window.addModuleToActiveCabinet = addModuleToActiveCabinet;
window.removeModule = removeModule;
window.saveFurniture = saveFurniture;
window.selectTemplate = selectTemplate;
window.resetView = resetView;
window.changeView = changeView;
window.toggleWireframe = toggleWireframe;
window.explodeView = explodeView;
window.deleteSelectedModule = deleteSelectedModule;
window.exportConfiguration = exportConfiguration;
window.furniture = furniture;
window.rebuildAll = rebuildAll;
window.updateUI = updateUI;

console.log('✅ Configurateur Drag & Drop chargé !');