/**
 * AssetManager.js - Handles loading and caching of game assets
 */

class AssetManager {
    /**
     * Unified AssetManager: robust loader initialization, async batch loading, Map-based storage, error handling, clear API
     */
    constructor() {
        // Use Map for extensible, performant storage
        this.textures = new Map();
        this.models = new Map();
        this.sounds = new Map();
        this.loading = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this._initLoaders();
        console.log('Unified AssetManager initialized');
    }

    /**
     * Safely initialize loaders with fallbacks
     */
    _initLoaders() {
        // TextureLoader initialization with fallback
        try {
            if (typeof THREE.TextureLoader === 'function') {
                this.textureLoader = new THREE.TextureLoader();
                this.textureLoader.setCrossOrigin('anonymous');
            } else {
                this._createMockTextureLoader();
            }
        } catch (error) {
            console.warn('Failed to create TextureLoader:', error);
            this._createMockTextureLoader();
        }
        // GLTFLoader initialization with fallback
        try {
            if (typeof THREE.GLTFLoader === 'function') {
                this.gltfLoader = new THREE.GLTFLoader();
                // Set up DRACOLoader if available
                if (typeof THREE.DRACOLoader === 'function') {
                    const dracoLoader = new THREE.DRACOLoader();
                    dracoLoader.setDecoderPath((typeof CONFIG !== 'undefined' && CONFIG.DRACO_PATH) ? CONFIG.DRACO_PATH : 'libs/draco/decoder/');
                    this.gltfLoader.setDRACOLoader(dracoLoader);
                }
            } else {
                this._createMockGLTFLoader();
            }
        } catch (error) {
            console.warn('Failed to create GLTFLoader:', error);
            this._createMockGLTFLoader();
        }
    }

    _createMockTextureLoader() {
        this.textureLoader = { load: (path, onLoad) => { console.warn('Mock texture loader used for', path); onLoad && onLoad(null); } };
    }
    _createMockGLTFLoader() {
        this.gltfLoader = { load: (path, onLoad) => { console.warn('Mock GLTF loader used for', path); onLoad && onLoad(null); } };
    }

    /**
     * Load multiple textures
     * @param {Array} textureList - Array of texture objects with key and path
     * @param {Function} progressCallback - Callback for loading progress
     * @returns {Promise} Resolves when all textures are loaded
     */
    async loadTextures(textureList, progressCallback) {
        if (!textureList || textureList.length === 0) return Promise.resolve();
        let loaded = 0;
        const promises = textureList.map(item => {
            return new Promise(resolve => {
                this.textureLoader.load(
                    item.path,
                    texture => {
                        this.textures.set(item.key, texture);
                        loaded++;
                        if (progressCallback) progressCallback(loaded / textureList.length);
                        resolve(texture);
                    },
                    undefined,
                    error => {
                        console.warn(`Failed to load texture ${item.path}:`, error);
                        loaded++;
                        if (progressCallback) progressCallback(loaded / textureList.length);
                        resolve(null);
                    }
                );
            });
        });
        return Promise.all(promises);
    }

    /**
     * Load multiple models
     * @param {Array} modelList - Array of model objects with key and path
     * @param {Function} progressCallback - Callback for loading progress
     * @returns {Promise} Resolves when all models are loaded
     */
    async loadModels(modelList, progressCallback) {
        if (!modelList || modelList.length === 0) return Promise.resolve();
        let loaded = 0;
        const promises = modelList.map(item => {
            return new Promise(resolve => {
                this.gltfLoader.load(
                    item.path,
                    gltf => {
                        this.models.set(item.key, gltf);
                        loaded++;
                        if (progressCallback) progressCallback(loaded / modelList.length);
                        resolve(gltf);
                    },
                    undefined,
                    error => {
                        console.warn(`Failed to load model ${item.path}:`, error);
                        loaded++;
                        if (progressCallback) progressCallback(loaded / modelList.length);
                        resolve(null);
                    }
                );
            });
        });
        return Promise.all(promises);
    }

    /**
     * Load multiple sounds (stub, extend as needed)
     */
    async loadSounds(soundList, progressCallback) {
        // Implement as needed, similar to textures/models
        return Promise.resolve();
    }

    /**
     * Get loaded texture by key
     */
    getTexture(key) { return this.textures.get(key) || null; }
    /**
     * Get loaded model by key
     */
    getModel(key) { return this.models.get(key) || null; }
    /**
     * Get loaded sound by key
     */
    getSound(key) { return this.sounds.get(key) || null; }
}

// Export for use in other modules
window.AssetManager = AssetManager; 