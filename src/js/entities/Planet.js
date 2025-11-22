/**
 * Planet.js - Represents a planet in the solar system
 */

class Planet extends Entity {
    constructor(config = {}) {
        super();
        
        // Planet properties
        this.name = config.name || 'Unknown Planet';
        this.radius = config.radius || 1;
        this.mass = config.mass || 1;
        // Keplerian orbital elements (with fallback for legacy configs)
        this.semiMajorAxis = config.semiMajorAxis || config.orbitRadius || 10;
        this.eccentricity = config.eccentricity !== undefined ? config.eccentricity : 0.0;
        this.inclination = config.inclination || 0.0;
        this.longitudeOfAscendingNode = config.longitudeOfAscendingNode || 0.0;
        this.argumentOfPeriapsis = config.argumentOfPeriapsis || 0.0;
        this.meanAnomalyAtEpoch = config.meanAnomalyAtEpoch || 0.0;
        this.orbitalPeriod = config.orbitalPeriod || config.orbitSpeed || 1;
        this.rotationSpeed = config.rotationSpeed || 0.5;
        this.hasRings = config.hasRings || false;
        this.color = config.color || 0x3366ff;
        
        // Orbital position
        this.orbitAngle = config.initialPosition || 0;
        
        // Create the 3D object
        this._createObject();
        
        console.log(`Planet created: ${this.name}`);
    }
    
    /**
     * Create the planet object
     */
    _createObject() {
        // Create planet geometry
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        
        // Create material - either use the provided texture or a basic color
        let material;
        if (window.engine && window.engine.assetManager) {
            const texture = window.engine.assetManager.getTexture(this.name.toLowerCase());
            if (texture) {
                material = new THREE.MeshPhongMaterial({ map: texture });
            } else {
                material = new THREE.MeshPhongMaterial({ color: this.color });
            }
        } else {
            material = new THREE.MeshPhongMaterial({ color: this.color });
        }
        
        // Create the planet mesh
        this.object = new THREE.Mesh(geometry, material);
        
        // Add rings if needed
        if (this.hasRings) {
            this._createRings();
        }
        
        // Create planet atmosphere if specified
        if (this.hasAtmosphere) {
            this._createAtmosphere();
        }
    }
    
    /**
     * Create rings for the planet
     */
    _createRings() {
        // Create ring geometry
        const innerRadius = this.radius * 1.4;
        const outerRadius = this.radius * 2.2;
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
        
        // Create ring material - use texture if available
        let ringMaterial;
        if (window.engine && window.engine.assetManager) {
            const texture = window.engine.assetManager.getTexture(`${this.name.toLowerCase()}_ring`);
            if (texture) {
                ringMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: true
                });
            } else {
                ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5
                });
            }
        } else {
            ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
        }
        
        // Create ring mesh
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2;
        
        // Add rings to planet
        this.object.add(rings);
        this.rings = rings;
    }
    
    /**
     * Create atmosphere for the planet
     */
    _createAtmosphere() {
        // Create atmosphere geometry (slightly larger than planet)
        const geometry = new THREE.SphereGeometry(this.radius * 1.05, 32, 32);
        
        // Create atmosphere material
        const material = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        // Create atmosphere mesh
        const atmosphere = new THREE.Mesh(geometry, material);
        
        // Add atmosphere to planet
        this.object.add(atmosphere);
        this.atmosphere = atmosphere;
    }
    
    /**
     * Update the planet's position and rotation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.object) return;

        // Simple circular orbit
        this.orbitAngle += (deltaTime / this.orbitalPeriod) * 0.1;
        const x = Math.cos(this.orbitAngle) * this.semiMajorAxis;
        const z = Math.sin(this.orbitAngle) * this.semiMajorAxis;
        this.object.position.set(x, 0, z);

        // Rotate the planet on its axis
        this.object.rotation.y += this.rotationSpeed * deltaTime;
    }
    
    /**
     * Get the planet's radius
     * @returns {number} The planet's radius
     */
    getRadius() {
        return this.radius;
    }
    
    /**
     * Get the planet's mass
     * @returns {number} The planet's mass
     */
    getMass() {
        return this.mass;
    }
}

// Export for use in other modules
window.Planet = Planet; 