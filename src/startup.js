/**
 * startup.js - Unified game initialization
 * Single entry point for starting the space simulation
 */

(function() {
    'use strict';

    // Debug helper
    function debugLog(message) {
        console.log(`[Startup] ${message}`);
        const debugEl = document.getElementById('loading-debug');
        if (debugEl) {
            debugEl.innerHTML += message + '<br>';
        }
    }

    // Verify required dependencies
    function verifyDependencies() {
        const required = {
            'THREE': typeof THREE !== 'undefined',
            'THREE.Scene': typeof THREE !== 'undefined' && typeof THREE.Scene === 'function',
            'CONFIG': typeof CONFIG !== 'undefined',
            'Entity': typeof Entity !== 'undefined',
            'SceneManager': typeof SceneManager !== 'undefined',
            'AssetManager': typeof AssetManager !== 'undefined',
            'Engine': typeof Engine !== 'undefined'
        };

        let allPresent = true;
        for (const [name, present] of Object.entries(required)) {
            if (!present) {
                debugLog(`MISSING: ${name}`);
                allPresent = false;
            }
        }

        return allPresent;
    }

    // Main initialization
    async function init() {
        debugLog('Starting initialization...');

        // Verify all dependencies loaded
        if (!verifyDependencies()) {
            debugLog('ERROR: Missing required dependencies');
            updateLoadingProgress(0, 'Error: Missing dependencies');
            return false;
        }
        debugLog('All dependencies loaded');
        updateLoadingProgress(10, 'Dependencies verified');

        try {
            // Create and initialize engine
            debugLog('Creating Engine...');
            window.engine = new Engine();
            updateLoadingProgress(20, 'Engine created');

            debugLog('Initializing Engine...');
            const engineReady = await window.engine.init();

            if (!engineReady) {
                throw new Error('Engine initialization failed');
            }
            updateLoadingProgress(80, 'Engine initialized');

            // Create game instance if available
            if (typeof Game !== 'undefined') {
                debugLog('Creating Game...');
                window.game = new Game(window.engine);
                await window.game.init();
                updateLoadingProgress(90, 'Game initialized');
            }

            // Start the game loop
            debugLog('Starting game loop...');
            window.engine.start();
            updateLoadingProgress(100, 'Ready!');

            // Hide loading screen
            setTimeout(hideLoadingScreen, 500);

            debugLog('Initialization complete!');
            return true;

        } catch (error) {
            debugLog(`ERROR: ${error.message}`);
            console.error('Initialization error:', error);
            updateLoadingProgress(0, `Error: ${error.message}`);
            return false;
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export debug function
    window.debugTHREE = function() {
        console.log('THREE:', typeof THREE !== 'undefined');
        console.log('GLTFLoader:', typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined');
        console.log('DRACOLoader:', typeof THREE !== 'undefined' && typeof THREE.DRACOLoader !== 'undefined');
        console.log('Engine:', typeof Engine !== 'undefined');
        console.log('Game:', typeof Game !== 'undefined');
    };

})();
