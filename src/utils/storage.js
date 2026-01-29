/**
 * Safe Storage Utility
 * Provides a wrapper around localStorage with an in-memory fallback
 * to prevent SecurityError and crashes in restricted environments (Private Mode, etc.)
 */

class MemoryStorage {
    constructor() {
        this.data = {};
    }
    setItem(key, value) {
        this.data[key] = String(value);
    }
    getItem(key) {
        return this.data.hasOwnProperty(key) ? this.data[key] : null;
    }
    removeItem(key) {
        delete this.data[key];
    }
    clear() {
        this.data = {};
    }
}

const createSafeStorage = () => {
    const memoryFallback = new MemoryStorage();
    let useLocalStorage = false;

    try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        useLocalStorage = true;
    } catch (e) {
        console.warn('⚠️ Localstorage is restricted or unavailable. Falling back to In-Memory storage.');
    }

    const storage = useLocalStorage ? window.localStorage : memoryFallback;

    return {
        setItem: (key, value) => {
            try {
                storage.setItem(key, value);
            } catch (e) {
                console.error(`Error saving to storage: ${key}`, e);
                // Failover to memory if setItem fails on actual storage
                if (useLocalStorage) {
                    memoryFallback.setItem(key, value);
                }
            }
        },
        getItem: (key) => {
            try {
                return storage.getItem(key);
            } catch (e) {
                console.error(`Error reading from storage: ${key}`, e);
                return useLocalStorage ? memoryFallback.getItem(key) : null;
            }
        },
        removeItem: (key) => {
            try {
                storage.removeItem(key);
            } catch (e) {
                console.error(`Error removing from storage: ${key}`, e);
                if (useLocalStorage) memoryFallback.removeItem(key);
            }
        },
        clear: () => {
            try {
                storage.clear();
            } catch (e) {
                console.error('Error clearing storage', e);
                if (useLocalStorage) memoryFallback.clear();
            }
        },
        isPersistent: useLocalStorage
    };
};

export const safeStorage = createSafeStorage();
