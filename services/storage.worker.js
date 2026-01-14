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
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(state, KEY);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Worker: Failed to save state:', err);
        throw err;
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
