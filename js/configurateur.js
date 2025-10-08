
        // Configuration globale
        const config = {
            material: 'epicea',
            finish: 'brut',
            shape: 'LD1',
            thickness: 19,
            length: 600,
            width: 300,
            corners: {
                tl: 'square',
                tr: 'square',
                bl: 'square',
                br: 'square'
            },
            quantity: 1,
            hingeMachining: false,
            tabletHoles: false
        };

        const materials = [
            { id: 'epicea', name: 'Épicéa 3 plis', pricePerM2: 45, color: '#D4A574' },
            { id: 'mdf', name: 'MDF', pricePerM2: 28, color: '#8B7355' },
            { id: 'contreplaque', name: 'Contreplaqué', pricePerM2: 35, color: '#C19A6B' },
            { id: 'osb', name: 'OSB', pricePerM2: 22, color: '#B8956A' },
            { id: 'agglomere', name: 'Aggloméré', pricePerM2: 18, color: '#9B8B7E' }
        ];

        const shapes = [
            { id: 'LD1', name: 'Rectangle', path: 'M 50 50 L 250 50 L 250 150 L 50 150 Z' },
            { id: 'LD2', name: 'Coin arrondi', path: 'M 50 70 Q 50 50 70 50 L 230 50 Q 250 50 250 70 L 250 130 Q 250 150 230 150 L 70 150 Q 50 150 50 130 Z' },
            { id: 'LD3', name: 'Arrondi', path: 'M 50 50 L 230 50 Q 250 50 250 70 L 250 150 L 50 150 Z' },
            { id: 'LD4', name: 'Trapèze', path: 'M 70 50 L 230 50 L 250 150 L 50 150 Z' },
            { id: 'LD5', name: 'Angle coupé', path: 'M 50 50 L 250 50 L 250 130 L 230 150 L 50 150 Z' },
            { id: 'LD6', name: 'Trapèze arrondi', path: 'M 70 50 Q 50 50 50 70 L 50 130 Q 50 150 70 150 L 230 150 Q 250 150 250 130 L 250 70 Q 250 50 230 50 Z' },
            { id: 'LD7', name: 'Demi-ovale', path: 'M 50 150 L 50 100 Q 50 50 150 50 Q 250 50 250 100 L 250 150 Z' },
            { id: 'LD8', name: 'Ovale complet', path: 'M 50 100 Q 50 50 150 50 Q 250 50 250 100 Q 250 150 150 150 Q 50 150 50 100' }
        ];

        // Initialisation
        function init() {
            renderMaterials();
            renderShapes();
            updateVisualization();
            updatePricing();
        }

        function renderMaterials() {
            const grid = document.getElementById('material-grid');
            grid.innerHTML = materials.map(mat => `
                <div class="material-option ${mat.id === config.material ? 'active' : ''}" onclick="setMaterial('${mat.id}')">
                    <div class="material-color" style="background-color: ${mat.color}"></div>
                    <div class="material-info">
                        <div class="material-name">${mat.name}</div>
                        <div class="material-price">${mat.pricePerM2} €/m²</div>
                    </div>
                </div>
            `).join('');
        }

        function renderShapes() {
            const grid = document.getElementById('shape-grid');
            grid.innerHTML = shapes.map(shape => `
                <div class="shape-option ${shape.id === config.shape ? 'active' : ''}" onclick="setShape('${shape.id}')" title="${shape.name}">
                    <svg viewBox="0 0 300 200">
                        <path d="${shape.path}" fill="none" stroke="#2d3748" stroke-width="3"/>
                    </svg>
                </div>
            `).join('');
        }

        function setMaterial(id) {
            config.material = id;
            document.querySelectorAll('.material-option').forEach(el => {
                el.classList.toggle('active', el.onclick.toString().includes(id));
            });
            updateVisualization();
            updatePricing();
        }

        function setFinish(finish) {
            config.finish = finish;
            document.querySelectorAll('.finish-btn').forEach(btn => {
                btn.classList.toggle('active', btn.onclick.toString().includes(finish));
            });
            updatePricing();
        }

        function setShape(id) {
            config.shape = id;
            document.querySelectorAll('.shape-option').forEach(el => {
                el.classList.toggle('active', el.onclick.toString().includes(id));
            });
            updateVisualization();
        }

        function setCorner(corner, type, btn) {
            config.corners[corner] = type;
            const parent = btn.parentElement;
            parent.querySelectorAll('.corner-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateVisualization();
            updatePricing();
        }

        function toggleAccordion(header) {
            const content = header.nextElementSibling;
            const isActive = content.classList.contains('active');
            
            header.classList.toggle('active', !isActive);
            content.classList.toggle('active', !isActive);
        }

        function updateConfig() {
            config.thickness = parseInt(document.getElementById('thickness').value);
            config.length = parseInt(document.getElementById('length').value);
            config.width = parseInt(document.getElementById('width').value);
            config.quantity = parseInt(document.getElementById('quantity').value);
            config.hingeMachining = document.getElementById('hinge-machining').checked;
            config.tabletHoles = document.getElementById('tablet-holes').checked;
            
            // Afficher/masquer le message d'info pour les trous
            const tabletHolesInfo = document.getElementById('tablet-holes-info');
            tabletHolesInfo.style.display = config.tabletHoles ? 'block' : 'none';
            
            updateVisualization();
            updatePricing();
        }

        function updateVisualization() {
            const material = materials.find(m => m.id === config.material);
            const w = Math.min(config.length / 2, 250);
            const h = Math.min(config.width / 2, 150);
            const cx = 300;
            const cy = 200;
            const radius = 20;

            let path = '';
            
            // Utiliser la forme sélectionnée si ce n'est pas une forme personnalisée
            const selectedShape = shapes.find(s => s.id === config.shape);
            if (selectedShape && ['LD1', 'LD2', 'LD3', 'LD4', 'LD5', 'LD6', 'LD7', 'LD8'].includes(config.shape)) {
                // Adapter le chemin de la forme à nos dimensions
                const scaleX = w / 100;
                const scaleY = h / 50;
                
                // Créer un chemin basé sur la forme sélectionnée mais avec gestion des coins
                if (config.shape === 'LD1') {
                    path = buildPathWithCorners(cx, cy, w, h, radius);
                } else if (config.shape === 'LD2') {
                    // Rectangle avec tous les coins arrondis
                    path = `M ${cx - w/2 + 20} ${cy - h/2} 
                            L ${cx + w/2 - 20} ${cy - h/2} 
                            Q ${cx + w/2} ${cy - h/2} ${cx + w/2} ${cy - h/2 + 20} 
                            L ${cx + w/2} ${cy + h/2 - 20} 
                            Q ${cx + w/2} ${cy + h/2} ${cx + w/2 - 20} ${cy + h/2} 
                            L ${cx - w/2 + 20} ${cy + h/2} 
                            Q ${cx - w/2} ${cy + h/2} ${cx - w/2} ${cy + h/2 - 20} 
                            L ${cx - w/2} ${cy - h/2 + 20} 
                            Q ${cx - w/2} ${cy - h/2} ${cx - w/2 + 20} ${cy - h/2} Z`;
                } else if (config.shape === 'LD3') {
                    // Arrondi en haut
                    path = `M ${cx - w/2} ${cy + h/2} 
                            L ${cx - w/2} ${cy} 
                            Q ${cx - w/2} ${cy - h/2} ${cx} ${cy - h/2} 
                            Q ${cx + w/2} ${cy - h/2} ${cx + w/2} ${cy} 
                            L ${cx + w/2} ${cy + h/2} Z`;
                } else if (config.shape === 'LD4') {
                    // Trapèze
                    path = `M ${cx - w/2 + 20} ${cy - h/2} 
                            L ${cx + w/2 - 20} ${cy - h/2} 
                            L ${cx + w/2} ${cy + h/2} 
                            L ${cx - w/2} ${cy + h/2} Z`;
                } else if (config.shape === 'LD5') {
                    // Angle coupé en bas à droite
                    path = `M ${cx - w/2} ${cy - h/2} 
                            L ${cx + w/2} ${cy - h/2} 
                            L ${cx + w/2} ${cy + h/2 - 30} 
                            L ${cx + w/2 - 30} ${cy + h/2} 
                            L ${cx - w/2} ${cy + h/2} Z`;
                } else if (config.shape === 'LD6') {
                    // Trapèze avec coins arrondis
                    path = `M ${cx - w/2 + 20} ${cy - h/2} 
                            Q ${cx - w/2} ${cy - h/2} ${cx - w/2} ${cy - h/2 + 20} 
                            L ${cx - w/2} ${cy + h/2 - 20} 
                            Q ${cx - w/2} ${cy + h/2} ${cx - w/2 + 20} ${cy + h/2} 
                            L ${cx + w/2 - 20} ${cy + h/2} 
                            Q ${cx + w/2} ${cy + h/2} ${cx + w/2} ${cy + h/2 - 20} 
                            L ${cx + w/2} ${cy - h/2 + 20} 
                            Q ${cx + w/2} ${cy - h/2} ${cx + w/2 - 20} ${cy - h/2} Z`;
                } else if (config.shape === 'LD7') {
                    // Demi-ovale
                    path = `M ${cx - w/2} ${cy + h/2} 
                            L ${cx - w/2} ${cy} 
                            Q ${cx - w/2} ${cy - h/2} ${cx} ${cy - h/2} 
                            Q ${cx + w/2} ${cy - h/2} ${cx + w/2} ${cy} 
                            L ${cx + w/2} ${cy + h/2} Z`;
                } else if (config.shape === 'LD8') {
                    // Ovale complet
                    path = `M ${cx - w/2} ${cy} 
                            Q ${cx - w/2} ${cy - h/2} ${cx} ${cy - h/2} 
                            Q ${cx + w/2} ${cy - h/2} ${cx + w/2} ${cy} 
                            Q ${cx + w/2} ${cy + h/2} ${cx} ${cy + h/2} 
                            Q ${cx - w/2} ${cy + h/2} ${cx - w/2} ${cy}`;
                }
            } else {
                path = buildPathWithCorners(cx, cy, w, h, radius);
            }

            let svgContent = `<path d="${path}" fill="${material.color}" stroke="#333" stroke-width="2"/>`;

            // Ajouter les charnières si sélectionnées
            if (config.hingeMachining) {
                const hingeY1 = cy - h/3;
                const hingeY2 = cy + h/3;
                const hingeX = cx - w/2;
                
                // Charnière 1
                svgContent += `
                    <g transform="translate(${hingeX}, ${hingeY1})">
                        <rect x="-15" y="-20" width="15" height="40" fill="#666" stroke="#333" stroke-width="1.5" rx="3"/>
                        <circle cx="-7.5" cy="-12" r="2.5" fill="#333"/>
                        <circle cx="-7.5" cy="0" r="2.5" fill="#333"/>
                        <circle cx="-7.5" cy="12" r="2.5" fill="#333"/>
                        <line x1="-15" y1="-20" x2="0" y2="-20" stroke="#333" stroke-width="1.5"/>
                        <line x1="-15" y1="20" x2="0" y2="20" stroke="#333" stroke-width="1.5"/>
                    </g>
                `;
                
                // Charnière 2
                svgContent += `
                    <g transform="translate(${hingeX}, ${hingeY2})">
                        <rect x="-15" y="-20" width="15" height="40" fill="#666" stroke="#333" stroke-width="1.5" rx="3"/>
                        <circle cx="-7.5" cy="-12" r="2.5" fill="#333"/>
                        <circle cx="-7.5" cy="0" r="2.5" fill="#333"/>
                        <circle cx="-7.5" cy="12" r="2.5" fill="#333"/>
                        <line x1="-15" y1="-20" x2="0" y2="-20" stroke="#333" stroke-width="1.5"/>
                        <line x1="-15" y1="20" x2="0" y2="20" stroke="#333" stroke-width="1.5"/>
                    </g>
                `;
            }

            // Ajouter les trous pour tablettes si sélectionnés
            if (config.tabletHoles) {
                const holeSpacing = 32; // Entraxe de 32mm
                const startMargin = 80; // Démarre à 80mm du bord
                const holeRadius = 4; // Diamètre 8mm = rayon 4mm
                
                // Convertir les dimensions réelles en pixels du canvas
                const pixelPerMm = h / config.width;
                const startY = cy - h/2 + (startMargin * pixelPerMm);
                const endY = cy + h/2 - (startMargin * pixelPerMm);
                const spacingPx = holeSpacing * pixelPerMm;
                
                // Trous sur le côté gauche
                const leftX = cx - w/2 + 15;
                for (let y = startY; y <= endY; y += spacingPx) {
                    svgContent += `<circle cx="${leftX}" cy="${y}" r="${holeRadius}" fill="white" stroke="#333" stroke-width="1.5"/>`;
                }
                
                // Trous sur le côté droit
                const rightX = cx + w/2 - 15;
                for (let y = startY; y <= endY; y += spacingPx) {
                    svgContent += `<circle cx="${rightX}" cy="${y}" r="${holeRadius}" fill="white" stroke="#333" stroke-width="1.5"/>`;
                }
            }

            const shapeGroup = document.getElementById('shape-group');
            shapeGroup.innerHTML = svgContent;

            // Labels
            document.getElementById('label-length').textContent = `C: ${config.length} mm`;
            document.getElementById('label-width').textContent = `D: ${config.width} mm`;
            
            // Surface et épaisseur
            const surfaceM2 = (config.length * config.width) / 1000000;
            document.getElementById('surface-display').textContent = `${surfaceM2.toFixed(3)} m²`;
            document.getElementById('thickness-display').textContent = `${config.thickness} mm`;
        }

        function buildPathWithCorners(cx, cy, w, h, radius) {
            const tl = config.corners.tl;
            const tr = config.corners.tr;
            const bl = config.corners.bl;
            const br = config.corners.br;
            let path = '';

            // Coin haut gauche
            if (tl === 'square') {
                path += `M ${cx - w/2} ${cy - h/2} `;
            } else if (tl === 'round') {
                path += `M ${cx - w/2 + radius} ${cy - h/2} `;
            } else {
                path += `M ${cx - w/2} ${cy - h/2} `;
            }

            // Ligne haut
            if (tr === 'round') {
                path += `L ${cx + w/2 - radius} ${cy - h/2} Q ${cx + w/2} ${cy - h/2} ${cx + w/2} ${cy - h/2 + radius} `;
            } else if (tr === 'bevel') {
                path += `L ${cx + w/2 - radius} ${cy - h/2} L ${cx + w/2} ${cy - h/2 + radius} `;
            } else {
                path += `L ${cx + w/2} ${cy - h/2} `;
            }

            // Ligne droite
            if (br === 'round') {
                path += `L ${cx + w/2} ${cy + h/2 - radius} Q ${cx + w/2} ${cy + h/2} ${cx + w/2 - radius} ${cy + h/2} `;
            } else if (br === 'bevel') {
                path += `L ${cx + w/2} ${cy + h/2 - radius} L ${cx + w/2 - radius} ${cy + h/2} `;
            } else {
                path += `L ${cx + w/2} ${cy + h/2} `;
            }

            // Ligne bas
            if (bl === 'round') {
                path += `L ${cx - w/2 + radius} ${cy + h/2} Q ${cx - w/2} ${cy + h/2} ${cx - w/2} ${cy + h/2 - radius} `;
            } else if (bl === 'bevel') {
                path += `L ${cx - w/2 + radius} ${cy + h/2} L ${cx - w/2} ${cy + h/2 - radius} `;
            } else {
                path += `L ${cx - w/2} ${cy + h/2} `;
            }

            // Ligne gauche
            if (tl === 'round') {
                path += `L ${cx - w/2} ${cy - h/2 + radius} Q ${cx - w/2} ${cy - h/2} ${cx - w/2 + radius} ${cy - h/2} `;
            } else if (tl === 'bevel') {
                path += `L ${cx - w/2} ${cy - h/2 + radius} L ${cx - w/2 + radius} ${cy - h/2} `;
            } else {
                path += `L ${cx - w/2} ${cy - h/2} `;
            }

            path += 'Z';

            const shapeGroup = document.getElementById('shape-group');
            shapeGroup.innerHTML = `<path d="${path}" fill="${material.color}" stroke="#333" stroke-width="2"/>`;

            // Labels
            document.getElementById('label-length').textContent = `C: ${config.length} mm`;
            document.getElementById('label-width').textContent = `D: ${config.width} mm`;
            
            // Surface et épaisseur
            const surfaceM2 = (config.length * config.width) / 1000000;
            document.getElementById('surface-display').textContent = `${surfaceM2.toFixed(3)} m²`;
            document.getElementById('thickness-display').textContent = `${config.thickness} mm`;
        }

        function updatePricing() {
            const material = materials.find(m => m.id === config.material);
            const surfaceM2 = (config.length * config.width) / 1000000;
            
            let basePrice = surfaceM2 * material.pricePerM2;
            
            // Finition
            if (config.finish === 'standard') {
                basePrice *= 1.15;
            }
            
            // Épaisseur
            if (config.thickness > 19) {
                basePrice *= (1 + (config.thickness - 19) * 0.02);
            }
            
            // Forme
            if (config.shape === 'LD2' || config.shape === 'LD6') basePrice *= 1.1;
            if (config.shape === 'LD3' || config.shape === 'LD7' || config.shape === 'LD8') basePrice *= 1.2;
            if (config.shape === 'LD4' || config.shape === 'LD5') basePrice *= 1.15;
            
            // Coins
            const roundedCorners = Object.values(config.corners).filter(c => c === 'round').length;
            const beveledCorners = Object.values(config.corners).filter(c => c === 'bevel').length;
            basePrice += roundedCorners * 5;
            basePrice += beveledCorners * 3;
            
            // Options d'usinage
            let accessoriesPrice = 0;
            if (config.hingeMachining) accessoriesPrice += 8;
            if (config.tabletHoles) accessoriesPrice += 12;
            
            const unitPrice = basePrice;
            const subtotal = unitPrice * config.quantity;
            const shipping = 11.99;
            const tax = subtotal * 0.2;
            const total = subtotal + accessoriesPrice + shipping + tax;
            
            document.getElementById('unit-price').textContent = `${unitPrice.toFixed(2)} €`;
            document.getElementById('accessories-price').textContent = `${accessoriesPrice.toFixed(2)} €`;
            document.getElementById('tax-price').textContent = `${tax.toFixed(2)} €`;
            document.getElementById('total-price').textContent = `${total.toFixed(2)} €`;
        }

        // Initialisation au chargement
        document.addEventListener('DOMContentLoaded', init);
