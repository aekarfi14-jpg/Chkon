/**
 * Pure offline persistent storage driver
 * Uses LocalStorage with memory fallback. Completely offline, zero network requests.
 */

const STORAGE_PREFIX = 'shkoun_';

class LocalStorageDriver {
  private memFallback: Map<string, string> = new Map();

  getItem<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        const item = this.memFallback.get(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
      }
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[StorageDriver] Error reading key "${key}":`, e);
      return defaultValue;
    }
  }

  setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (typeof window === 'undefined' || !window.localStorage) {
        this.memFallback.set(STORAGE_PREFIX + key, serialized);
        return true;
      }
      localStorage.setItem(STORAGE_PREFIX + key, serialized);
      return true;
    } catch (e) {
      console.error(`[StorageDriver] Error writing key "${key}":`, e);
      return false;
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.memFallback.delete(STORAGE_PREFIX + key);
        return;
      }
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.warn(`[StorageDriver] Error removing key "${key}":`, e);
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
      this.memFallback.clear();
    } catch (e) {
      console.warn('[StorageDriver] Error clearing storage:', e);
    }
  }
}

export const storage = new LocalStorageDriver();
