/**
 * DebugLogger.js - Centralized logging system with file output support
 * Writes to both console and debug-log.txt (in browser via download, in Node via fs)
 */

class DebugLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevel = 'debug'; // debug, info, warn, error
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.startTime = Date.now();
        this.enabled = true;

        // Auto-save interval (browser)
        this.autoSaveInterval = null;

        console.log('[DebugLogger] Initialized');
    }

    /**
     * Get timestamp string
     */
    _timestamp() {
        const now = new Date();
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(3);
        return `[${now.toISOString()}][+${elapsed}s]`;
    }

    /**
     * Format log entry
     */
    _format(level, category, message, data) {
        let entry = `${this._timestamp()} [${level.toUpperCase()}]`;
        if (category) entry += ` [${category}]`;
        entry += ` ${message}`;
        if (data !== undefined) {
            try {
                entry += ` | ${JSON.stringify(data)}`;
            } catch (e) {
                entry += ` | [Object - circular ref]`;
            }
        }
        return entry;
    }

    /**
     * Core logging method
     */
    _log(level, category, message, data) {
        if (!this.enabled) return;
        if (this.levels[level] < this.levels[this.logLevel]) return;

        const entry = this._format(level, category, message, data);
        this.logs.push(entry);

        // Trim old logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output with color
        const colors = {
            debug: 'color: #888',
            info: 'color: #4a9',
            warn: 'color: #fa0',
            error: 'color: #f44'
        };

        if (typeof console !== 'undefined') {
            if (level === 'error') {
                console.error(entry);
            } else if (level === 'warn') {
                console.warn(entry);
            } else {
                console.log(`%c${entry}`, colors[level] || '');
            }
        }

        return entry;
    }

    // Convenience methods
    debug(category, message, data) { return this._log('debug', category, message, data); }
    info(category, message, data) { return this._log('info', category, message, data); }
    warn(category, message, data) { return this._log('warn', category, message, data); }
    error(category, message, data) { return this._log('error', category, message, data); }

    /**
     * Log with automatic category from caller
     */
    log(message, data) {
        return this._log('info', null, message, data);
    }

    /**
     * Get all logs as string
     */
    getLogText() {
        return [
            '='.repeat(60),
            'SPACESIM DEBUG LOG',
            `Generated: ${new Date().toISOString()}`,
            `Total entries: ${this.logs.length}`,
            '='.repeat(60),
            '',
            ...this.logs
        ].join('\n');
    }

    /**
     * Save logs to file (browser - triggers download)
     */
    saveToFile(filename = 'debug-log.txt') {
        const text = this.getLogText();

        if (typeof document !== 'undefined') {
            // Browser environment
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            this.info('DebugLogger', `Saved ${this.logs.length} entries to ${filename}`);
        } else if (typeof require !== 'undefined') {
            // Node.js environment
            try {
                const fs = require('fs');
                fs.writeFileSync(filename, text);
                this.info('DebugLogger', `Saved ${this.logs.length} entries to ${filename}`);
            } catch (e) {
                console.error('Failed to write log file:', e);
            }
        }
    }

    /**
     * Clear all logs
     */
    clear() {
        this.logs = [];
        this.info('DebugLogger', 'Logs cleared');
    }

    /**
     * Set minimum log level
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.logLevel = level;
            this.info('DebugLogger', `Log level set to ${level}`);
        }
    }

    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Get error summary
     */
    getErrorSummary() {
        const errors = this.logs.filter(l => l.includes('[ERROR]'));
        const warns = this.logs.filter(l => l.includes('[WARN]'));
        return {
            totalLogs: this.logs.length,
            errors: errors.length,
            warnings: warns.length,
            errorMessages: errors,
            warningMessages: warns
        };
    }

    /**
     * Start auto-save (writes to localStorage periodically)
     */
    startAutoSave(intervalMs = 30000) {
        if (typeof localStorage !== 'undefined') {
            this.autoSaveInterval = setInterval(() => {
                localStorage.setItem('spacesim_debug_log', this.getLogText());
            }, intervalMs);
        }
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Export for both browser and Node.js
if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
    window.debugLogger = debugLogger;
    window.logger = debugLogger; // Shorthand

    // Global error handler
    window.addEventListener('error', (event) => {
        debugLogger.error('GLOBAL', `Uncaught error: ${event.message}`, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
        debugLogger.error('GLOBAL', `Unhandled promise rejection: ${event.reason}`);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DebugLogger, debugLogger };
}
