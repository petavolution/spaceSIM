// Environment.js - Manages skybox, stars, asteroid field, and environment objects

class Environment {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.stars = [];
        this.asteroids = [];
        this.starTexture = null;
    }
    
    /**
     * Initializes the entire environment
     */
    async initialize() {
        try {
            // Load star texture first if needed
            if (window.assetManager) {
                this.starTexture = window.assetManager.getTexture('star');
                if (!this.starTexture) {
                    try {
                        this.starTexture = new THREE.TextureLoader().load('assets/textures/star.png');
                    } catch (error) {
                        console.warn("Couldn't load star texture:", error);
                        // Use fallback
                        this.starTexture = window.assetManager.createFallbackTexture('star');
                    }
                }
            } else {
                console.warn("AssetManager not available, using basic texture");
                // Create a basic texture
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 32, 32);
                this.starTexture = new THREE.CanvasTexture(canvas);
            }
            
            // Add skybox
            this.addSkybox();
            
            // Add stars
            this.addStars();
            
            // Add asteroid belt
            await this.createAsteroidBelt();
        } catch (error) {
            console.error("Error initializing environment:", error);
            // Continue anyway to show at least some environment
        }
    }
    
    /**
     * Creates a skybox around the scene
     */
    addSkybox() {
        try {
            // Check if we're running locally (file://) which will cause CORS issues in Firefox
            const isLocalFile = window.location.protocol === 'file:';
            
            if (isLocalFile) {
                console.log('Using fallback skybox due to local file access constraints in Firefox');
                this.createFallbackSkybox();
                return;
            }
            
            // Create array of file paths for the 6 skybox faces
            const skyboxPathPrefix = 'assets/textures/skybox/';
            const skyboxSides = ['px', 'nx', 'py', 'ny', 'pz', 'nz']; // Positive/negative x, y, z
            const skyboxExtension = '.jpg';
            
            const skyboxPaths = skyboxSides.map(side => `${skyboxPathPrefix}${side}${skyboxExtension}`);
            
            // Try to load skybox textures
            try {
                // Load skybox textures
                const loader = new THREE.CubeTextureLoader();
                loader.crossOrigin = 'anonymous'; // Enable cross-origin loading
                const skyboxTexture = loader.load(skyboxPaths);
                
                // Set skybox as scene background
                this.sceneManager.scene.background = skyboxTexture;
            } catch (error) {
                console.warn("Couldn't load skybox textures, using fallback:", error);
                this.createFallbackSkybox();
            }
        } catch (error) {
            console.error("Error adding skybox:", error);
            // Set a simple color background as fallback
            this.sceneManager.scene.background = new THREE.Color(0x000011);
        }
    }
    
    /**
     * Creates a fallback skybox when textures can't be loaded
     */
    createFallbackSkybox() {
        // Create a large sphere to serve as skybox
        const geometry = new THREE.SphereGeometry(1000, 32, 32);
        
        // Invert the geometry so we see it from the inside
        geometry.scale(-1, 1, 1);
        
        // Create a gradient material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x000000) },
                offset: { value: 400 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        // Create the mesh and add it to the scene
        const skybox = new THREE.Mesh(geometry, material);
        this.sceneManager.add(skybox);
    }
    
    /**
     * Adds stars to the scene as particles
     */
    addStars() {
        // Different star densities for better visual distribution
        this.addStarLayer(8000, 1000, 0.2, 1.5); // Distant stars, smaller
        this.addStarLayer(2000, 500, 0.5, 2.5);  // Medium distance stars
        this.addStarLayer(1000, 300, 1.0, 3.0);  // Closer stars, larger
    }
    
    /**
     * Adds a layer of stars with specific parameters
     * @param {number} count - Number of stars in this layer
     * @param {number} radius - Distribution radius
     * @param {number} minSize - Minimum star size
     * @param {number} maxSize - Maximum star size
     */
    addStarLayer(count, radius, minSize, maxSize) {
        // Create star particles
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(count * 3);
        const starSizes = new Float32Array(count);
        const starColors = new Float32Array(count * 3);
        
        // Star color variations
        const colors = [
            new THREE.Color(0xffffff), // White
            new THREE.Color(0xffffdd), // Warm white
            new THREE.Color(0xddddff), // Cool white
            new THREE.Color(0xffdddd), // Reddish
            new THREE.Color(0xddffff)  // Bluish
        ];
        
        // Generate random positions, sizes and colors
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Random position within a sphere
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.5) * radius; // Distribute more stars near center
            
            starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            starPositions[i3 + 2] = r * Math.cos(phi);
            
            // Random size
            starSizes[i] = minSize + Math.random() * (maxSize - minSize);
            
            // Random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            starColors[i3] = color.r;
            starColors[i3 + 1] = color.g;
            starColors[i3 + 2] = color.b;
        }
        
        // Set attributes
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        
        // Create shader material for stars
        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: this.starTexture }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                    if (gl_FragColor.a < 0.3) discard;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            transparent: true
        });
        
        // Create the star particles
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.sceneManager.add(stars);
        this.stars.push(stars);
    }
    
    /**
     * Creates the asteroid belt
     */
    createAsteroidBelt() {
        // Asteroid belt parameters
        const asteroidCount = 3000; // Increase number for density
        const minRadius = 50;  // Closer to player start position
        const maxRadius = 70;
        const minY = -5;
        const maxY = 5;
        
        console.log("Creating dense asteroid field near player start position");
        
        // Define player start area for dense asteroid placement
        const playerStartArea = {
            center: new THREE.Vector3(60, 3, 60),
            radius: 15
        };
        
        try {
            // Store all asteroids
            this.asteroids = [];
            
            // Create a density map to distribute asteroids
            // 0 = center, 1 = edge of belt
            const densityMap = (r, phi, theta) => {
                const maxR = maxRadius - minRadius;
                const normalizedR = (r - minRadius) / maxR;
                
                // Default density - highest at center of belt
                let density = 1 - Math.abs(normalizedR - 0.5) * 2;
                
                // Convert to cartesian coordinates
                const x = r * Math.cos(phi) * Math.sin(theta);
                const y = r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(theta);
                const pos = new THREE.Vector3(x, y, z);
                
                // Check if in player area - increase density there
                const distToPlayerArea = pos.distanceTo(playerStartArea.center);
                if (distToPlayerArea < playerStartArea.radius + 10) {
                    // Boost density near player start
                    density *= 2;
                }
                
                return density;
            };
            
            // Try to load or create asteroid model
            let asteroidModel;
            try {
                // Try to get asteroid model
                if (window.assetManager) {
                    asteroidModel = window.assetManager.getModel('asteroid');
                }
                
                // If not loaded, load it now
                if (!asteroidModel) {
                    console.log('Loading asteroid model');
                    if (window.assetManager) {
                        window.assetManager.loadModel('asteroid', 'assets/models/asteroid.glb')
                        .then(model => {
                            asteroidModel = model;
                            this.completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, asteroidModel, playerStartArea);
                        })
                        .catch(error => {
                            console.warn('Error loading asteroid model:', error);
                            this.completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, null, playerStartArea);
                        });
                    } else {
                        this.completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, null, playerStartArea);
                    }
                } else {
                    this.completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, asteroidModel, playerStartArea);
                }
            } catch (error) {
                console.error('Error creating asteroid belt:', error);
                this.completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, null, playerStartArea);
            }
        } catch (error) {
            console.error('Error initializing asteroid belt:', error);
        }
    }
    
    /**
     * Completes asteroid belt creation with or without model
     */
    completeAsteroidBelt(asteroidCount, minRadius, maxRadius, minY, maxY, densityMap, asteroidModel, playerStartArea) {
        try {
            console.log('Completing asteroid belt creation with model:', !!asteroidModel);
            
            // Start with the instanced mesh approach for performance
            let instancedMesh;
            let asteroidGeometry;
            let asteroidMaterial;
            
            if (!asteroidModel) {
                // Create simple asteroid geometry
                asteroidGeometry = new THREE.IcosahedronGeometry(0.5, 1);
                asteroidMaterial = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    roughness: 0.8,
                    metalness: 0.2
                });
                
                // Create instanced mesh
                instancedMesh = new THREE.InstancedMesh(
                    asteroidGeometry,
                    asteroidMaterial,
                    asteroidCount
                );
                instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                
                // Add to scene
                this.sceneManager.add(instancedMesh);
            }
            
            // Reserve a portion of asteroids for the player start area
            const playerAreaAsteroidCount = Math.floor(asteroidCount * 0.3); // 30% near player
            const beltAsteroidCount = asteroidCount - playerAreaAsteroidCount;
            
            // Matrix for instanced mesh transformations
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const rotation = new THREE.Euler();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            
            // Create asteroids for the main belt
            let instanceIndex = 0;
            
            // First, create main belt asteroids
            for (let i = 0; i < beltAsteroidCount; i++) {
                // Use polar coordinates for even distribution
                const r = minRadius + Math.random() * (maxRadius - minRadius);
                const theta = Math.random() * Math.PI; // 0 to PI (hemisphere)
                const phi = Math.random() * Math.PI * 2; // 0 to 2PI (full circle)
                
                // Calculate density at this position
                const density = densityMap(r, phi, theta);
                
                // Skip based on density
                if (Math.random() > density) continue;
                
                // Convert to cartesian coordinates
                position.x = r * Math.cos(phi) * Math.sin(theta);
                position.y = minY + Math.random() * (maxY - minY);
                position.z = r * Math.cos(theta);
                
                // Skip if too close to player start area
                const distToPlayerArea = position.distanceTo(playerStartArea.center);
                if (distToPlayerArea < playerStartArea.radius) continue;
                
                // Random rotation
                rotation.x = Math.random() * Math.PI * 2;
                rotation.y = Math.random() * Math.PI * 2;
                rotation.z = Math.random() * Math.PI * 2;
                quaternion.setFromEuler(rotation);
                
                // Random size
                const s = 0.5 + Math.random() * 1.5;
                scale.set(s, s, s);
                
                // Set matrix
                matrix.compose(position, quaternion, scale);
                
                // Add to instanced mesh or create individual mesh
                if (instancedMesh) {
                    instancedMesh.setMatrixAt(instanceIndex, matrix);
                    instanceIndex++;
                } else if (asteroidModel) {
                    // Clone the model for each asteroid
                    const asteroid = asteroidModel.scene.clone();
                    asteroid.position.copy(position);
                    asteroid.rotation.copy(rotation);
                    asteroid.scale.copy(scale);
                    this.sceneManager.add(asteroid);
                    this.asteroids.push(asteroid);
                }
            }
            
            // Now create asteroids concentrated near player start area
            for (let i = 0; i < playerAreaAsteroidCount; i++) {
                // Random position within the player start area plus some margin
                const radius = playerStartArea.radius * (0.5 + Math.random() * 1.5);
                const angle = Math.random() * Math.PI * 2;
                
                // Position in a ring around player start
                position.x = playerStartArea.center.x + Math.cos(angle) * radius;
                position.y = playerStartArea.center.y + (Math.random() * 6 - 3);
                position.z = playerStartArea.center.z + Math.sin(angle) * radius;
                
                // Random rotation
                rotation.x = Math.random() * Math.PI * 2;
                rotation.y = Math.random() * Math.PI * 2;
                rotation.z = Math.random() * Math.PI * 2;
                quaternion.setFromEuler(rotation);
                
                // Random size - smaller near player for visibility
                const s = 0.3 + Math.random();
                scale.set(s, s, s);
                
                // Set matrix
                matrix.compose(position, quaternion, scale);
                
                // Add to instanced mesh or create individual mesh
                if (instancedMesh) {
                    instancedMesh.setMatrixAt(instanceIndex, matrix);
                    instanceIndex++;
                } else if (asteroidModel) {
                    // Clone the model for each asteroid
                    const asteroid = asteroidModel.scene.clone();
                    asteroid.position.copy(position);
                    asteroid.rotation.copy(rotation);
                    asteroid.scale.copy(scale);
                    this.sceneManager.add(asteroid);
                    this.asteroids.push(asteroid);
                }
            }
            
            // Update instance matrix
            if (instancedMesh) {
                instancedMesh.count = instanceIndex;
                instancedMesh.instanceMatrix.needsUpdate = true;
                this.asteroidMesh = instancedMesh;
            }
            
            console.log(`Created ${instanceIndex} asteroids (${this.asteroids.length} individual, ${instancedMesh ? instancedMesh.count : 0} instanced)`);
        } catch (error) {
            console.error('Error in completeAsteroidBelt:', error);
        }
    }
    
    /**
     * Updates all dynamic environment elements
     */
    update(deltaTime) {
        // Check if we have instanced asteroids or individual asteroid meshes
        if (this.asteroidMesh && this.asteroidMesh.count > 0) {
            // Using instanced mesh - no need to update positions individually
            // The instanced mesh stays static in our implementation
        } else if (this.asteroids.length > 0) {
            // Only update individual asteroids if we have any
            this.updateAsteroids(deltaTime);
        }
        
        // Rotate stars slowly for subtle movement effect
        for (const star of this.stars) {
            star.rotation.y += 0.0001 * deltaTime;
            star.rotation.z += 0.0002 * deltaTime;
        }
    }
    
    /**
     * Updates individual asteroid objects
     */
    updateAsteroids(deltaTime) {
        // Small rotation for asteroids to make them more dynamic
        for (const asteroid of this.asteroids) {
            // Check if asteroid has the necessary properties before using them
            if (asteroid && asteroid.rotation) {
                // Just rotate them slightly for visual effect
                asteroid.rotation.x += 0.001 * deltaTime;
                asteroid.rotation.y += 0.002 * deltaTime;
                asteroid.rotation.z += 0.001 * deltaTime;
            }
        }
    }
    
    /**
     * Finds all asteroids within a specified range of a position
     * @param {THREE.Vector3} position Position to check from
     * @param {number} range Maximum distance to check
     * @returns {Array} Array of nearby asteroid objects
     */
    findNearbyAsteroids(position, range) {
        const nearbyAsteroids = [];
        
        try {
            // Individual asteroids - easy to check
            if (this.asteroids && this.asteroids.length > 0) {
                for (const asteroid of this.asteroids) {
                    const distance = position.distanceTo(asteroid.position);
                    if (distance < range) {
                        nearbyAsteroids.push(asteroid);
                    }
                }
            }
            
            // Instanced mesh - need to check each instance
            if (this.asteroidMesh && this.asteroidMesh.count > 0) {
                // Need to check each matrix in the instanced mesh
                const instanceMatrix = new THREE.Matrix4();
                const instancePosition = new THREE.Vector3();
                
                for (let i = 0; i < this.asteroidMesh.count; i++) {
                    this.asteroidMesh.getMatrixAt(i, instanceMatrix);
                    // Extract position from matrix
                    instancePosition.setFromMatrixPosition(instanceMatrix);
                    
                    const distance = position.distanceTo(instancePosition);
                    if (distance < range) {
                        // Create a proxy object with position for collision handling
                        nearbyAsteroids.push({
                            position: instancePosition.clone(),
                            index: i,
                            type: 'instanced'
                        });
                    }
                }
            }
            
            // Log if we found any nearby asteroids
            if (nearbyAsteroids.length > 0) {
                console.log(`Found ${nearbyAsteroids.length} asteroids within ${range} units of player`);
            }
        } catch (error) {
            console.error('Error finding nearby asteroids:', error);
        }
        
        return nearbyAsteroids;
    }
    
    /**
     * Checks if a given position is within the player's starting area
     * @param {THREE.Vector3} position The position to check
     * @param {object} playerStartArea The player's starting area
     * @returns {boolean} True if the position is within the player's starting area, false otherwise
     */
    isInPlayerArea(position, playerStartArea) {
        const distance = position.distanceTo(playerStartArea.center);
        return distance <= playerStartArea.radius;
    }
}

// Export class - instantiate later when SceneManager is ready
window.Environment = Environment; 