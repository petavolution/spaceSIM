/**
 * Gravity.js - Gravitational force calculations
 * Usage: Gravity.calculateForce(m1, m2, pos1, pos2)
 */

const Gravity = {
    // Universal gravitational constant (m^3 kg^-1 s^-2)
    // Scaled for simulation units
    G: 6.67430e-11,

    // Simulation scale factor (adjust for game units)
    SCALE: 1e9,

    /**
     * Calculate gravitational force vector from m2 on m1
     * @param {number} m1 - Mass of body 1 (kg)
     * @param {number} m2 - Mass of body 2 (kg)
     * @param {Object} pos1 - Position {x, y, z} of body 1
     * @param {Object} pos2 - Position {x, y, z} of body 2
     * @returns {Object} Force vector {x, y, z}
     */
    calculateForce(m1, m2, pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        const rSquared = dx * dx + dy * dy + dz * dz;
        const r = Math.sqrt(rSquared);

        if (r === 0) return { x: 0, y: 0, z: 0 };

        const F = (this.G * m1 * m2) / rSquared;

        // Normalize direction and apply force
        return {
            x: (F * dx) / r,
            y: (F * dy) / r,
            z: (F * dz) / r
        };
    },

    /**
     * Calculate gravitational acceleration on body 1 due to body 2
     * @param {number} m2 - Mass of attracting body (kg)
     * @param {Object} pos1 - Position of affected body
     * @param {Object} pos2 - Position of attracting body
     * @returns {Object} Acceleration vector {x, y, z}
     */
    calculateAcceleration(m2, pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        const rSquared = dx * dx + dy * dy + dz * dz;
        const r = Math.sqrt(rSquared);

        if (r === 0) return { x: 0, y: 0, z: 0 };

        const a = (this.G * m2) / rSquared;

        return {
            x: (a * dx) / r,
            y: (a * dy) / r,
            z: (a * dz) / r
        };
    },

    /**
     * Calculate orbital velocity for circular orbit
     * @param {number} m - Mass of central body (kg)
     * @param {number} r - Orbital radius
     * @returns {number} Orbital velocity
     */
    orbitalVelocity(m, r) {
        return Math.sqrt((this.G * m) / r);
    }
};

// Export for browser
window.Gravity = Gravity;
