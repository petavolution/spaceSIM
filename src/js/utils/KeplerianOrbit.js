/**
 * KeplerianOrbit.js - Keplerian orbital mechanics calculations
 * Calculates positions of celestial bodies using orbital elements
 */

const KeplerianOrbit = {
    /**
     * Calculate orbital position at given time
     * @param {Object} elements - Orbital elements
     * @param {number} elements.semiMajorAxis - Semi-major axis (a)
     * @param {number} elements.eccentricity - Orbital eccentricity (e)
     * @param {number} elements.inclination - Inclination in radians (i)
     * @param {number} elements.longitudeOfAscendingNode - Longitude of ascending node (Omega)
     * @param {number} elements.argumentOfPeriapsis - Argument of periapsis (omega)
     * @param {number} elements.meanAnomalyAtEpoch - Mean anomaly at epoch (M0)
     * @param {number} elements.orbitalPeriod - Orbital period in seconds (T)
     * @param {number} time - Time since epoch
     * @returns {Object} Position {x, y, z}
     */
    getOrbitalPosition(elements, time) {
        const {
            semiMajorAxis = 10,
            eccentricity = 0,
            inclination = 0,
            longitudeOfAscendingNode = 0,
            argumentOfPeriapsis = 0,
            meanAnomalyAtEpoch = 0,
            orbitalPeriod = 1
        } = elements;

        // Calculate mean anomaly at current time
        const M = meanAnomalyAtEpoch + (2 * Math.PI * time) / orbitalPeriod;

        // Solve Kepler's equation for eccentric anomaly (Newton-Raphson iterations)
        let E = M;
        for (let i = 0; i < 6; i++) {
            E = M + eccentricity * Math.sin(E);
        }

        // Calculate true anomaly
        const nu = 2 * Math.atan2(
            Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
            Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
        );

        // Calculate distance from focus
        const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));

        // Position in orbital plane
        const xOrb = r * Math.cos(nu);
        const yOrb = r * Math.sin(nu);

        // Rotation matrix components
        const cosO = Math.cos(longitudeOfAscendingNode);
        const sinO = Math.sin(longitudeOfAscendingNode);
        const cosI = Math.cos(inclination);
        const sinI = Math.sin(inclination);
        const cosW = Math.cos(argumentOfPeriapsis);
        const sinW = Math.sin(argumentOfPeriapsis);

        // Transform to 3D space
        const x = xOrb * (cosO * cosW - sinO * sinW * cosI) -
                  yOrb * (cosO * sinW + sinO * cosW * cosI);
        const y = xOrb * (sinO * cosW + cosO * sinW * cosI) -
                  yOrb * (sinO * sinW - cosO * cosW * cosI);
        const z = xOrb * (sinW * sinI) + yOrb * (cosW * sinI);

        return { x, y, z };
    },

    /**
     * Calculate orbital velocity at given position
     * @param {Object} elements - Orbital elements
     * @param {number} time - Time since epoch
     * @param {number} mu - Standard gravitational parameter (G * M)
     * @returns {Object} Velocity {x, y, z}
     */
    getOrbitalVelocity(elements, time, mu = 1) {
        const dt = 0.001;
        const pos1 = this.getOrbitalPosition(elements, time);
        const pos2 = this.getOrbitalPosition(elements, time + dt);

        return {
            x: (pos2.x - pos1.x) / dt,
            y: (pos2.y - pos1.y) / dt,
            z: (pos2.z - pos1.z) / dt
        };
    },

    /**
     * Calculate orbital period from semi-major axis and central mass
     * @param {number} a - Semi-major axis
     * @param {number} mu - Standard gravitational parameter
     * @returns {number} Orbital period
     */
    calculatePeriod(a, mu) {
        return 2 * Math.PI * Math.sqrt((a * a * a) / mu);
    }
};

// Global function alias for backwards compatibility
function getOrbitalPosition(elements, time) {
    return KeplerianOrbit.getOrbitalPosition(elements, time);
}

// Export for browser
window.KeplerianOrbit = KeplerianOrbit;
window.getOrbitalPosition = getOrbitalPosition;
