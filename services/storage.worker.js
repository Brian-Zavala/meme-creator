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
async function saveState(state) {
    try {
        // OPTIMIZATION: Convert Data URLs to Blobs for efficient storage & faster main-thread load
        // We clone to avoid mutating the payload passed in (though usually safe in worker)
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

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(optimizedState, KEY);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.code === 22) { // 22 is QUOTA_EXCEEDED_ERR
             console.warn('Worker: Storage Quota Exceeded. Failed to save state.', err);
             // Optional: Trigger a cleanup event or just fail gracefully
             // prevent throwing to keep app alive
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
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
