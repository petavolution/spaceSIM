/**
 * THREE.js Loader
 * Loads THREE.js from CDN (for offline use, download three.min.js locally)
 *
 * Note: document.write is used because THREE.js must load synchronously
 * before any dependent scripts. This is acceptable for initial page load.
 */

// Create the THREE namespace
window.THREE = window.THREE || {};

// Load THREE.js from CDN
// For offline use: download https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js
// and replace this document.write with a local script reference in index.html
document.write('<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"><\/script>');

console.log('[THREE.js] Loading from CDN...');
