/**
 * Engine.js
 * Central core of the game that manages initialization, updates, and rendering.
 * Provides a simplified API to interact with all game systems.
 */

class Engine {
  constructor() {
    // Core components
    this.sceneManager = null;
    this.assetManager = null;
    this.inputManager = null;
    this.audioManager = null;
    
    // Game entities
    this.solarSystem = null;
    this.spacecraft = null;
    
    // Engine state
    this.isInitialized = false;
    this.isRunning = false;
    this.isPaused = false;
    
    // Performance monitoring
    this.lastTime = 0;
    this.frameTime = 0;
    this.frameCount = 0;
    this.fpsUpdateInterval = 500; // ms
    this.lastFpsUpdate = 0;
    this.fps = 0;
    
    // Bind methods to maintain scope
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    
    // Event listeners
    this.eventListeners = {};
  }
  
  /**
   * Initializes the game engine and all related components
   */
  async init() {
    console.log('Initializing Engine...');
    updateLoadingProgress(10, 'Starting engine initialization...');
    
    try {
      // Initialize Three.js first
      await this._initThreeJs();
      updateLoadingProgress(20, 'Three.js initialized');
      
      // Create core managers
      await this._initCoreManagers();
      updateLoadingProgress(40, 'Core managers initialized');
      
      // Load assets
      await this._loadAssets();
      updateLoadingProgress(60, 'Assets loaded');
      
      // Create game world
      await this._createGameWorld();
      updateLoadingProgress(80, 'Game world created');
      
      // Set up input handling
      this._setupInputHandlers();
      updateLoadingProgress(90, 'Input handlers set up');
      
      // Setup is complete
      this.isInitialized = true;
      console.log('Engine initialization complete');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      updateDebugText(`Engine error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Initializes Three.js and its extensions
   */
  async _initThreeJs() {
    // Use ThreeLoader to properly load Three.js
    if (!window.ThreeLoader) {
      console.error('ThreeLoader not found - this is required');
      throw new Error('ThreeLoader not available');
    }
    
    const success = await window.ThreeLoader.init();
    if (!success) {
      console.warn('ThreeLoader initialization returned false - continuing with fallbacks');
    }
    return success;
  }
  
  /**
   * Initialize all core manager components
   */
  async _initCoreManagers() {
    // Create scene manager (don't require a specific container)
    this.sceneManager = new SceneManager();
    
    // Add lights to the scene
    this.sceneManager.addLights();
    
    // Create asset manager
    if (typeof AssetManager !== 'undefined') {
      this.assetManager = new AssetManager();
    } else {
      // Minimal implementation if not available
      this.assetManager = {
        loadTextures: async () => {},
        loadModels: async () => {},
        getTexture: () => null,
        getModel: () => null
      };
      console.warn('AssetManager not defined, using fallback');
    }
    
    // Create input manager
    if (typeof InputManager !== 'undefined') {
      this.inputManager = new InputManager();
    } else {
      // Minimal implementation if not available
      this.inputManager = {
        addKeyBinding: () => {},
        removeKeyBinding: () => {},
        isKeyPressed: () => false
      };
      console.warn('InputManager not defined, using fallback');
    }
    
    // Create audio manager
    if (typeof AudioManager !== 'undefined') {
      this.audioManager = new AudioManager();
      await this.audioManager.init();
    } else {
      // Minimal implementation if not available
      this.audioManager = {
        init: async () => {},
        loadSound: () => {},
        playSound: () => {}
      };
      console.warn('AudioManager not defined, using fallback');
    }
    
    // Make playSound globally available
    window.playSound = (soundId, options) => {
      if (this.audioManager) {
        return this.audioManager.playSound(soundId, options);
      }
      return null;
    };
  }
  
  /**
   * Preload all necessary game assets
   */
  async _loadAssets() {
    try {
      // Check if CONFIG is defined and has necessary properties
      if (typeof CONFIG === 'undefined' || !CONFIG.textures || !CONFIG.celestialBodies) {
        console.warn('CONFIG is missing or incomplete, skipping asset loading');
        return;
      }
      
      // Prepare lists for loading
      const textureList = [];
      const modelList = [];
      
      // Add planet textures to preload list
      for (const [key, planetConfig] of Object.entries(CONFIG.celestialBodies)) {
        if (CONFIG.textures.planets && CONFIG.textures.planets[key]) {
          textureList.push({
            key: key,
            path: CONFIG.textures.planets[key]
          });
          
          // Add ring texture if needed
          if (planetConfig.hasRings && CONFIG.textures.planets[`${key}_ring`]) {
            textureList.push({
              key: `${key}_ring`,
              path: CONFIG.textures.planets[`${key}_ring`]
            });
          }
        }
      }
      
      // Add special texture for stars
      textureList.push({
        key: 'star',
        path: 'assets/textures/star.png'
      });
      
      // Add model files to preload list if they exist
      if (CONFIG.models && CONFIG.models.spacecraft) {
        modelList.push({
          key: 'spacecraft',
          path: CONFIG.models.spacecraft
        });
      }
      
      if (CONFIG.models && CONFIG.models.asteroid) {
        modelList.push({
          key: 'asteroid',
          path: CONFIG.models.asteroid
        });
      }
      
      // Load textures and models in parallel
      await Promise.all([
        // Preload all textures
        this.assetManager.loadTextures(textureList, (progress) => {
          updateLoadingProgress(40 + progress * 0.1, 'Loading textures...');
        }),
        
        // Preload all models
        this.assetManager.loadModels(modelList, (progress) => {
          updateLoadingProgress(50 + progress * 0.1, 'Loading 3D models...');
        })
      ]);
      
      console.log('Assets loaded successfully');
    } catch (error) {
      console.warn('Error loading assets:', error);
      // Continue anyway - we'll use fallback textures
    }
  }
  
  /**
   * Create the game world and entities
   */
  async _createGameWorld() {
    try {
      // Create environment (skybox, stars, asteroids)
      if (typeof Environment !== 'undefined') {
        this.environment = new Environment(this.sceneManager);
        await this.environment.initialize();
        console.log('Environment created');
      }

      // Create solar system
      if (typeof SolarSystem !== 'undefined') {
        this.solarSystem = new SolarSystem();
        this.sceneManager.add(this.solarSystem.object);
        console.log('SolarSystem created');
      } else {
        // Fallback sun
        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sun = new THREE.Mesh(geometry, material);
        this.sceneManager.add(sun);
      }

      // Create spacecraft
      if (typeof Spacecraft !== 'undefined') {
        this.spacecraft = new Spacecraft();
        if (this.spacecraft.object) {
          this.sceneManager.add(this.spacecraft.object);
          console.log('Spacecraft created');
        }
      }
    } catch (error) {
      console.warn('Error creating game world:', error);
    }
  }
  
  /**
   * Set up input handlers
   */
  _setupInputHandlers() {
    try {
      if (!this.inputManager) return;

      // Pause controls
      this.inputManager.addKeyBinding('p', () => this.togglePause());
      this.inputManager.addKeyBinding('Escape', () => this.togglePause());

      // Spacecraft controls - using key state tracking
      const keys = {};

      document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (!this.spacecraft) return;

        switch(e.key.toLowerCase()) {
          case 'w': case 'arrowup': this.spacecraft.accelerate(true); break;
          case 's': case 'arrowdown': this.spacecraft.decelerate(true); break;
          case 'a': this.spacecraft.turnLeft(true); break;
          case 'd': this.spacecraft.turnRight(true); break;
          case 'arrowleft': this.spacecraft.turnLeft(true); break;
          case 'arrowright': this.spacecraft.turnRight(true); break;
          case 'q': this.spacecraft.rollLeft(true); break;
          case 'e': this.spacecraft.rollRight(true); break;
          case 'r': this.spacecraft.pitchUp(true); break;
          case 'f': this.spacecraft.pitchDown(true); break;
        }
      });

      document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        if (!this.spacecraft) return;

        switch(e.key.toLowerCase()) {
          case 'w': case 'arrowup': this.spacecraft.accelerate(false); break;
          case 's': case 'arrowdown': this.spacecraft.decelerate(false); break;
          case 'a': this.spacecraft.turnLeft(false); break;
          case 'd': this.spacecraft.turnRight(false); break;
          case 'arrowleft': this.spacecraft.turnLeft(false); break;
          case 'arrowright': this.spacecraft.turnRight(false); break;
          case 'q': this.spacecraft.rollLeft(false); break;
          case 'e': this.spacecraft.rollRight(false); break;
          case 'r': this.spacecraft.pitchUp(false); break;
          case 'f': this.spacecraft.pitchDown(false); break;
        }
      });

      console.log('Input handlers configured');
    } catch (error) {
      console.warn('Error setting up input handlers:', error);
    }
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return;
    
    console.log('Starting game loop');
    this.isRunning = true;
    this.lastTime = performance.now();
    
    // Start the animation loop
    requestAnimationFrame(this.gameLoop);
  }
  
  /**
   * Main game loop
   */
  gameLoop(timestamp) {
    if (!this.isRunning) return;
    
    // Calculate time since last frame
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    
    // Update FPS counter
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate > this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
      this.lastFpsUpdate = timestamp;
      this.frameCount = 0;
      
      // Update debug display with FPS
      if (window.updateDebugText) {
        updateDebugText(`FPS: ${this.fps}`);
      }
    }
    
    // Skip updates if paused
    if (!this.isPaused) {
      this.update(deltaTime);
      this._updateCollisions();
    }
    
    // Always render (even when paused)
    this.render();
    
    // Continue loop
    requestAnimationFrame(this.gameLoop);
  }
  
  /**
   * Update all game objects
   */
  update(deltaTime) {
    // Update spacecraft
    if (this.spacecraft) {
      this.spacecraft.update(deltaTime);
    }

    // Update solar system
    if (this.solarSystem) {
      this.solarSystem.update(deltaTime);
    }

    // Update environment
    if (this.environment) {
      this.environment.update(deltaTime);
    }

    // Update scene manager (camera follow, etc.)
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime);
    }
  }
  
  /**
   * Render the scene
   */
  render() {
    if (this.sceneManager) {
      this.sceneManager.render();
    }
  }
  
  /**
   * Check for collisions between objects
   */
  _updateCollisions() {
    // Basic collision detection implementation
    try {
      if (!this.spacecraft || !this.solarSystem) return;
      
      // Get spacecraft position
      const craftPosition = this.spacecraft.getPosition();
      if (!craftPosition) return;
      
      // Check distance to each planet
      const planets = this.solarSystem.getPlanets();
      if (!planets) return;
      
      for (const planet of planets) {
        const planetPosition = planet.getPosition();
        if (!planetPosition) continue;
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(craftPosition.x - planetPosition.x, 2) +
          Math.pow(craftPosition.y - planetPosition.y, 2) +
          Math.pow(craftPosition.z - planetPosition.z, 2)
        );
        
        // Get planet radius (or use default)
        const radius = planet.getRadius ? planet.getRadius() : 1;
        
        // Check collision
        if (distance < radius * 1.2) {
          this._handleCollision(planet);
        }
        // Check proximity warning
        else if (distance < radius * 2) {
          this._handleProximityWarning(planet, distance);
        }
      }
    } catch (error) {
      // Silent fail for collision detection
      console.debug('Collision detection error:', error);
    }
  }
  
  /**
   * Handle collision with a planet
   */
  _handleCollision(planet) {
    showMessage(`COLLISION with ${planet.name || 'a planet'}!`, 'error');
    
    // Trigger collision event
    this.trigger('collision', {
      planet: planet,
      spacecraft: this.spacecraft
    });
  }
  
  /**
   * Handle proximity warning
   */
  _handleProximityWarning(planet, distance) {
    showMessage(`WARNING: Close to ${planet.name || 'a planet'} - Distance: ${distance.toFixed(1)}`, 'warning');
    
    // Trigger proximity event
    this.trigger('proximity', {
      planet: planet,
      spacecraft: this.spacecraft,
      distance: distance
    });
  }
  
  /**
   * Toggle game pause state
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    
    // Show/hide pause screen
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) {
      pauseScreen.style.display = this.isPaused ? 'flex' : 'none';
    }
    
    console.log(this.isPaused ? 'Game paused' : 'Game resumed');
    
    // Trigger pause event
    this.trigger('pause', {
      isPaused: this.isPaused
    });
    
    // Show message
    showMessage(this.isPaused ? 'Game paused' : 'Game resumed', this.isPaused ? 'warning' : 'success');
    
    return this.isPaused;
  }
  
  /**
   * Clean up resources
   */
  shutdown() {
    console.log('Engine shutting down');
    
    // Stop the game loop
    this.isRunning = false;
    
    // Remove event listeners
    window.removeEventListener('resize', this.sceneManager.onWindowResize);
    
    // Clean up managers
    if (this.inputManager) {
      // Remove all key bindings
      this.inputManager.removeAllBindings();
    }
    
    // Stop audio
    if (this.audioManager) {
      this.audioManager.stopAll();
    }
    
    // Trigger shutdown event
    this.trigger('shutdown');
    
    // Clear global references
    window.engine = null;
  }
  
  /**
   * Register an event listener
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return this;
  }
  
  /**
   * Trigger an event
   */
  trigger(event, data = {}) {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
    return this;
  }
}

// Export the class
window.Engine = Engine; 