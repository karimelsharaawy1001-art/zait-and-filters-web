/**
 * SafeStorage Utility
 * Provides an in-memory fallback for localStorage and sessionStorage
 * to prevent SecurityErrors in restricted environments.
 */

// Global memory object to persist data during the app session
if (typeof window !== 'undefined' && !window.appMemory) {
    window.appMemory = {};
}

class SafeStorage {
    constructor(type = 'local') {
        this.type = type;
        this.prefix = `__safe_${type}__`;
    }

    getItem(key) {
        try {
            // Attempt to use real storage first, but catch any SecurityError
            if (typeof window !== 'undefined' && window[`${this.type}Storage`]) {
                return window[`${this.type}Storage`].getItem(key);
            }
        } catch (e) {
            console.warn(`[SafeStorage] ${this.type}Storage access denied. Falling back to memory.`);
        }

        // Fallback to in-memory storage
        return window.appMemory[this.prefix + key] || null;
    }

    setItem(key, value) {
        try {
            if (typeof window !== 'undefined' && window[`${this.type}Storage`]) {
                window[`${this.type}Storage`].setItem(key, value);
                return;
            }
        } catch (e) {
            // Silent fail or warning
        }

        // Fallback to in-memory storage
        window.appMemory[this.prefix + key] = String(value);
    }

    removeItem(key) {
        try {
            if (typeof window !== 'undefined' && window[`${this.type}Storage`]) {
                window[`${this.type}Storage`].removeItem(key);
                return;
            }
        } catch (e) {
            // Silent fail
        }

        // Fallback to in-memory storage
        delete window.appMemory[this.prefix + key];
    }

    clear() {
        try {
            if (typeof window !== 'undefined' && window[`${this.type}Storage`]) {
                window[`${this.type}Storage`].clear();
                return;
            }
        } catch (e) {
            // Silent fail
        }

        // Fallback to in-memory storage: clear only keys for this prefix
        Object.keys(window.appMemory).forEach(key => {
            if (key.startsWith(this.prefix)) {
                delete window.appMemory[key];
            }
        });
    }
}

export const safeLocalStorage = new SafeStorage('local');
export const safeSessionStorage = new SafeStorage('session');
