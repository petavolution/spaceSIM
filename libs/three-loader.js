/**
 * three-loader.js - Unified THREE.js initialization
 * Ensures THREE.js and extensions are properly loaded and accessible
 */

(function() {
    'use strict';

    // Check if THREE is already loaded (from three.module.js or CDN)
    if (typeof THREE === 'undefined') {
        console.error('[THREE-Loader] THREE.js is not loaded!');
        console.error('[THREE-Loader] Please ensure three.min.js or three.module.js is loaded first');

        // Create placeholder to prevent immediate crashes
        window.THREE = {
            Scene: function() { console.error('THREE not loaded'); },
            PerspectiveCamera: function() { console.error('THREE not loaded'); },
            WebGLRenderer: function() { console.error('THREE not loaded'); },
            Vector3: function() { this.x = 0; this.y = 0; this.z = 0; },
            Color: function() {},
            Clock: function() { this.getDelta = function() { return 0.016; }; }
        };
        return;
    }

    console.log('[THREE-Loader] THREE.js detected, version:', THREE.REVISION);

    // Export commonly needed items to THREE namespace for compatibility
    function ensureExtensions() {
        // OrbitControls
        if (typeof OrbitControls !== 'undefined' && !THREE.OrbitControls) {
            THREE.OrbitControls = OrbitControls;
            console.log('[THREE-Loader] Exported OrbitControls');
        }

        // GLTFLoader
        if (typeof GLTFLoader !== 'undefined' && !THREE.GLTFLoader) {
            THREE.GLTFLoader = GLTFLoader;
            console.log('[THREE-Loader] Exported GLTFLoader');
        }

        // DRACOLoader
        if (typeof DRACOLoader !== 'undefined' && !THREE.DRACOLoader) {
            THREE.DRACOLoader = DRACOLoader;
            console.log('[THREE-Loader] Exported DRACOLoader');
        }
    }

    // Run immediately
    ensureExtensions();

    // Also run after a short delay to catch late-loaded extensions
    setTimeout(ensureExtensions, 100);
    setTimeout(ensureExtensions, 500);

    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureExtensions);
    }

    // Run on window load
    window.addEventListener('load', ensureExtensions);

    console.log('[THREE-Loader] Initialization complete');
})();
