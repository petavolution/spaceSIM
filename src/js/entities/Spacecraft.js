/**
 * Spacecraft.js - Player-controlled spacecraft entity
 * Simplified, focused implementation
 */

class Spacecraft extends Entity {
    constructor(config = {}) {
        super();
        console.log('Creating Spacecraft instance');

        // Basic properties
        this.name = config.name || 'Spacecraft';
        this.speed = 0;
        this.maxSpeed = config.maxSpeed || 2;
        this.acceleration = config.acceleration || 0.05;
        this.rotationSpeed = config.rotationSpeed || 0.02;

        // Movement state
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isAccelerating = false;
        this.isDecelerating = false;
        this.isTurningLeft = false;
        this.isTurningRight = false;
        this.isPitchingUp = false;
        this.isPitchingDown = false;
        this.isRollingLeft = false;
        this.isRollingRight = false;

        // Create 3D object
        this._createObject();
    }

    /**
     * Create spacecraft 3D object
     */
    _createObject() {
        if (typeof THREE === 'undefined') {
            console.error('THREE not available for Spacecraft');
            return;
        }

        // Try to load model from asset manager
        if (window.engine && window.engine.assetManager) {
            const model = window.engine.assetManager.getModel('spacecraft');
            if (model && model.scene) {
                this.object = model.scene.clone();
                this.object.scale.set(0.5, 0.5, 0.5);
                this.object.position.set(60, 3, 60);
                console.log('Using GLTF spacecraft model');
                return;
            }
        }

        // Fallback: create simple spacecraft geometry
        this._createSimpleSpacecraft();
    }

    /**
     * Create simple spacecraft as fallback
     */
    _createSimpleSpacecraft() {
        this.object = new THREE.Object3D();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.object.add(body);

        // Cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x3333ff,
            transparent: true,
            opacity: 0.7
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.3, 0.5);
        this.object.add(cockpit);

        // Wings
        const wingGeometry = new THREE.BoxGeometry(5, 0.1, 2);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xcc3333 });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, 0, -0.5);
        this.object.add(wings);

        // Set initial position
        this.object.position.set(60, 3, 60);
        this.object.rotation.y = Math.PI;

        console.log('Created simple spacecraft model');
    }

    /**
     * Update spacecraft position and rotation
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.object) return;

        // Handle acceleration/deceleration
        if (this.isAccelerating) {
            this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
        } else if (this.isDecelerating) {
            this.speed = Math.max(this.speed - this.acceleration, -this.maxSpeed * 0.5);
        } else {
            // Gradual slowdown
            this.speed *= 0.99;
            if (Math.abs(this.speed) < 0.001) this.speed = 0;
        }

        // Handle rotation
        if (this.isTurningLeft) {
            this.object.rotation.y += this.rotationSpeed;
        }
        if (this.isTurningRight) {
            this.object.rotation.y -= this.rotationSpeed;
        }
        if (this.isPitchingUp) {
            this.object.rotation.x = Math.min(
                this.object.rotation.x + this.rotationSpeed * 0.5,
                Math.PI / 4
            );
        }
        if (this.isPitchingDown) {
            this.object.rotation.x = Math.max(
                this.object.rotation.x - this.rotationSpeed * 0.5,
                -Math.PI / 4
            );
        }
        if (this.isRollingLeft) {
            this.object.rotation.z += this.rotationSpeed * 0.5;
        }
        if (this.isRollingRight) {
            this.object.rotation.z -= this.rotationSpeed * 0.5;
        }

        // Calculate movement direction from rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.object.quaternion);

        // Update position
        this.object.position.x += direction.x * this.speed * deltaTime * 60;
        this.object.position.y += direction.y * this.speed * deltaTime * 60;
        this.object.position.z += direction.z * this.speed * deltaTime * 60;

        // Update HUD
        this._updateHUD();
    }

    /**
     * Update HUD elements
     */
    _updateHUD() {
        // Update speed display
        const speedEl = document.getElementById('speed-value');
        if (speedEl) {
            speedEl.textContent = Math.abs(this.speed * 100).toFixed(0);
        }

        // Update coordinates
        const pos = this.object.position;
        const xEl = document.getElementById('x-coord');
        const yEl = document.getElementById('y-coord');
        const zEl = document.getElementById('z-coord');
        if (xEl) xEl.textContent = pos.x.toFixed(1);
        if (yEl) yEl.textContent = pos.y.toFixed(1);
        if (zEl) zEl.textContent = pos.z.toFixed(1);
    }

    // Control methods
    accelerate(active) { this.isAccelerating = active; }
    decelerate(active) { this.isDecelerating = active; }
    turnLeft(active) { this.isTurningLeft = active; }
    turnRight(active) { this.isTurningRight = active; }
    pitchUp(active) { this.isPitchingUp = active; }
    pitchDown(active) { this.isPitchingDown = active; }
    rollLeft(active) { this.isRollingLeft = active; }
    rollRight(active) { this.isRollingRight = active; }

    // Getters
    getPosition() {
        return this.object ? this.object.position : { x: 0, y: 0, z: 0 };
    }

    getRotation() {
        return this.object ? this.object.rotation : { x: 0, y: 0, z: 0 };
    }

    getSpeed() {
        return this.speed;
    }
}

// Export
window.Spacecraft = Spacecraft;
