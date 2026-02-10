// Storage service with robust error handling and worker fallback
// Handles IndexedDB operations off the main thread when possible

// Timeout for worker operations (5 seconds)
const WORKER_TIMEOUT_MS = 5000;

// Track if we're using the worker or fallback mode
let useWorker = true;
let worker = null;

// Request Tracker
let nextRequestId = 0;
const pendingRequests = new Map();

/**
 * Initialize worker with error handling
 * Falls back to main-thread implementation if workers fail
 */
function initWorker() {
    try {
        worker = new Worker(new URL('./storage.worker.js', import.meta.url), { type: 'module' });

        worker.onmessage = (e) => {
            const { id, type, payload, success, error } = e.data;
            const request = pendingRequests.get(id);

            if (request) {
                clearTimeout(request.timeoutId);
                if (success) {
                    request.resolve(payload);
                } else {
                    console.error(`Storage Worker Error (${type}):`, error);
                    request.reject(new Error(error));
                }
                pendingRequests.delete(id);
            }
        };

        worker.onerror = (e) => {
            console.error('Storage worker error:', e);
            useWorker = false;
            // Reject all pending requests
            pendingRequests.forEach((request, id) => {
                clearTimeout(request.timeoutId);
                request.reject(new Error('Worker crashed'));
                pendingRequests.delete(id);
            });
        };
    } catch (err) {
        console.warn('Failed to initialize storage worker, using fallback:', err);
        useWorker = false;
    }
}

// Initialize worker on load
initWorker();

/**
 * Send request to worker with timeout
 */
function sendRequest(type, payload = null) {
    return new Promise((resolve, reject) => {
        if (!useWorker || !worker) {
            reject(new Error('Worker not available'));
            return;
        }

        const id = nextRequestId++;

        // Set timeout to prevent hanging forever
        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                console.warn(`Storage worker request timed out after ${WORKER_TIMEOUT_MS}ms`);
                reject(new Error('Worker request timeout'));
            }
        }, WORKER_TIMEOUT_MS);

        pendingRequests.set(id, { resolve, reject, timeoutId });
        worker.postMessage({ type, payload, id });
    });
}

// ============================================
// FALLBACK: Main-thread IndexedDB implementation
// Used when workers are unavailable
// ============================================

const DB_NAME = 'MemeCreatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const KEY = 'meme-generator-state';

function openDBFallback() {
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

async function saveStateFallback(state) {
    const db = await openDBFallback();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state, KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadStateFallback() {
    const db = await openDBFallback();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// EXPORTED API
// ============================================

/**
 * Sanitizes state object to ensure it is structured cloneable (serializable)
 * Removes functions, DOM elements, and circular references
 */
function sanitizeState(data) {
    if (data === null || data === undefined) return data;

    // Pass through primitives
    if (typeof data !== 'object') {
        // Filter out functions and symbols
        if (typeof data === 'function' || typeof data === 'symbol') return undefined;
        return data;
    }

    // Pass through valid binary types
    if (data instanceof Blob || data instanceof File || data instanceof ArrayBuffer) {
        return data;
    }

    // Handle Arrays
    if (Array.isArray(data)) {
        return data.map(sanitizeState);
    }

    // Handle Objects
    const sanitized = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
             // Skip internal React keys or hidden properties often starting with _ or $
             if (key.startsWith('_') || key.startsWith('$')) continue;

             const value = data[key];

             // Detect and skip DOM nodes (common cause of clone errors)
             if (value instanceof Element || value instanceof Node) continue;

             // Recursively sanitize
             const cleanValue = sanitizeState(value);

             // Only keep defined values
             if (cleanValue !== undefined) {
                 sanitized[key] = cleanValue;
             }
        }
    }
    return sanitized;
}

// Coalesce rapid saves - only the latest one runs
let pendingSaveTimer = null;
let pendingSaveState = null;

export async function saveState(state) {
    // Coalesce: if a save is already pending, just update the state to save
    pendingSaveState = state;
    if (pendingSaveTimer) return;

    pendingSaveTimer = setTimeout(async () => {
        pendingSaveTimer = null;
        const stateToSave = pendingSaveState;
        pendingSaveState = null;

        try {
            // Only sanitize present state — past/future are already clean from prior saves
            // and the worker only deep-processes present anyway
            const cleanState = {
                ...stateToSave,
                present: sanitizeState(stateToSave.present),
            };

            if (useWorker && worker) {
                await sendRequest('SAVE_STATE', cleanState);
            } else {
                await saveStateFallback(cleanState);
            }
        } catch (err) {
            console.error('Failed to save state:', err);
            if (useWorker) {
                useWorker = false;
                try {
                    await saveStateFallback(stateToSave);
                } catch (fallbackErr) {
                    console.error('Fallback save also failed:', fallbackErr);
                }
            }
        }
    }, 100);
}

export async function loadState() {
    try {
        let state;

        if (useWorker && worker) {
            state = await sendRequest('LOAD_STATE');
        } else {
            state = await loadStateFallback();
        }

        if (!state) return null;

        return processState(state);

    } catch (err) {
        console.error('Failed to load state:', err);

        // Try fallback if worker failed
        if (useWorker) {
            useWorker = false;
            try {
                const state = await loadStateFallback();
                return processState(state);
            } catch (fallbackErr) {
                console.error('Fallback load also failed:', fallbackErr);
            }
        }

        // Return null on complete failure - app will use defaults
        return null;
    }
}

// Helper to inflate Blobs to Object URLs (shared logic)
function processState(state) {
    if (!state) return null;

    const processItem = (item) => {
        if (item.url && item.url instanceof Blob) {
            return {
                ...item,
                url: URL.createObjectURL(item.url),
                sourceBlob: item.url
            };
        }
        return item;
    };

    const processSingleState = (s) => {
        if (!s) return s; // Safety check
        const next = { ...s }; // Shallow copy to avoid mutation if possible, mainly for safer iteration

        if (next.panels) {
            next.panels = next.panels.map(processItem);
        }
        if (next.stickers) {
            next.stickers = next.stickers.map(processItem);
        }
        return next;
    };

    // Check if version 2 history
    if (state.version === 2) {
        // Only process present — lazily process past/future on undo/redo access
        // to avoid creating unused Object URLs that pin blobs in memory
        const present = processSingleState(state.present);

        return {
            ...state,
            past: Array.isArray(state.past) ? state.past : [],
            present,
            future: Array.isArray(state.future) ? state.future : []
        };
    }

    // Legacy V1 (single state)
    return processSingleState(state);
}
