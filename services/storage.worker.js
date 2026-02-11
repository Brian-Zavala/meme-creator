/* eslint-disable no-restricted-globals */

// IndexedDB Constants
const DB_NAME = 'MemeCreatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const KEY = 'meme-generator-state';

// Helper: Open DB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Logic: Save State
async function saveState(fullHistory) {
    try {
        // Support both legacy (single state) and new (full history) formats transparently
        const isFullHistory = fullHistory && 'present' in fullHistory && Array.isArray(fullHistory.past);

        // Helper to process a single state object
        const processSingleState = async (state) => {
            const optimizedState = { ...state };

            const processItem = async (item) => {
                // ZERO-BLOCK PATH: Main thread passed us a Blob directly
                if (item.sourceBlob && (item.sourceBlob instanceof Blob || (item.sourceBlob.type && item.sourceBlob.size))) {
                   const newItem = { ...item, url: item.sourceBlob };
                   delete newItem.sourceBlob; // Cleanup temporary transport property
                   return newItem;
                }

                // LEGACY PATH: Client passed a Data URL string
                if (item.url && typeof item.url === 'string' && item.url.startsWith('data:')) {
                    try {
                        const res = await fetch(item.url);
                        const blob = await res.blob();
                        return { ...item, url: blob };
                    } catch (e) {
                        console.warn("Worker: Failed to convert Data URL to Blob", e);
                        return item;
                    }
                }
                return item;
            };

            if (optimizedState.panels) {
                optimizedState.panels = await Promise.all(optimizedState.panels.map(processItem));
            }
            if (optimizedState.stickers) {
                optimizedState.stickers = await Promise.all(optimizedState.stickers.map(processItem));
            }
            return optimizedState;
        };

        let dataToStore;
        if (isFullHistory) {
            // Only process present — past/future are already processed from prior saves
            // Processing all 15 history entries causes worker timeouts on mobile (>5000ms)
            const processedPresent = await processSingleState(fullHistory.present);

            dataToStore = {
                version: 2,
                present: processedPresent,
                past: fullHistory.past || [],
                future: fullHistory.future || []
            };
        } else {
            // Legacy single state mode
            dataToStore = await processSingleState(fullHistory);
        }

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(dataToStore, KEY);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.code === 22) {
             console.warn('Worker: Storage Quota Exceeded. Failed to save state.', err);
        } else {
            console.error('Worker: Failed to save state:', err);
            throw err;
        }
    }
}

// Logic: Load State
async function loadState() {
    try {
        const db = await openDB();
        const rawState = await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!rawState) return null;

        // SANITIZATION: Check for poisoned data (legacy huge Data URLs)
        // If we try to postMessage a 50MB object, the worker crashes.
        // We must clean it locally first.

        const isTooLarge = (JSON.stringify(rawState).length > 10_000_000); // >10MB check (rough)

        if (isTooLarge && rawState.past) {
            console.warn('Worker: State is massive, trimming history to prevent OOM crash');

            // Helper to strip data URLs from history items
            const stripHeavy = (item) => {
                const clean = { ...item };
                // Strip data URLs
                if (clean.url && typeof clean.url === 'string' && clean.url.startsWith('data:')) {
                    clean.url = null;
                }
                // Strip processed cache
                delete clean.processedImage;
                delete clean.sourceBlob; // Strip sourceBlob from history to verify safely (keeping it in present)
                return clean;
            };

            // Aggressive cleaning for history
             const cleanPast = (Array.isArray(rawState.past) ? rawState.past : [])
                .map(entry => {
                    const cleanEntry = { ...entry };
                    if (cleanEntry.panels) cleanEntry.panels = cleanEntry.panels.map(stripHeavy);
                    if (cleanEntry.stickers) cleanEntry.stickers = cleanEntry.stickers.map(stripHeavy);
                    return cleanEntry;
                })
                .slice(-3); // Only keep last 3

            return {
                ...rawState,
                past: cleanPast,
                future: [] // Drop future
            };
        }

        return rawState;
    } catch (err) {
        console.error('Worker: Failed to load state:', err);
        return null;
    }
}

// Message Listener
self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    try {
        if (type === 'SAVE_STATE') {
            await saveState(payload);
            self.postMessage({ type: 'SAVE_COMPLETE', id, success: true });
        } else if (type === 'LOAD_STATE') {
            const state = await loadState();
            self.postMessage({ type: 'LOAD_COMPLETE', id, payload: state, success: true });
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', id, error: err.message, success: false });
    }
};
