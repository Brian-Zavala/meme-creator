// Storage service with robust error handling and worker fallback
// Handles IndexedDB operations off the main thread when possible

// Timeout for worker operations (15 seconds)
// Increased from 5s because Lottie can block the main thread for 10s+,
// preventing the worker's postMessage callback from firing in time.
const WORKER_TIMEOUT_MS = 15000;

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
// Circuit breaker: stop retrying after consecutive OOM failures
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const FAILURE_COOLDOWN_MS = 30000; // 30s cooldown after max failures
let cooldownUntil = 0;

/**
 * Estimate rough byte size of a value for clone guard.
 * Not exact, but catches the multi-MB data URL case.
 */
function estimateSize(val, depth = 0) {
    if (depth > 5) return 100; // Prevent deep recursion
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') return val.length * 2; // UTF-16
    if (typeof val === 'number' || typeof val === 'boolean') return 8;
    if (val instanceof Blob) return val.size;
    if (Array.isArray(val)) {
        let size = 0;
        for (const item of val) {
            size += estimateSize(item, depth + 1);
            if (size > 50_000_000) return size; // Early exit
        }
        return size;
    }
    if (typeof val === 'object') {
        let size = 0;
        for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
                size += key.length * 2 + estimateSize(val[key], depth + 1);
                if (size > 50_000_000) return size;
            }
        }
        return size;
    }
    return 0;
}

/**
 * Strip heavy fields from a history entry (past/future).
 * - Removes sourceBlob (not serializable across sessions)
 * - Removes processedImage (temporary blob URL)
 * - Converts data URLs to a placeholder (they're multi-MB base64 strings
 *   that cause DataCloneError OOM when multiplied across history entries)
 */
function stripHeavyFields(entry) {
    if (!entry) return entry;
    const result = { ...entry };

    if (result.panels) {
        result.panels = result.panels.map(p => {
            const { sourceBlob, processedImage, processedDeepFryLevel, ...rest } = p;
            // Strip data URLs from past/future -- they're multi-MB base64 strings.
            // Remote URLs (https://) and blob: URLs (small reference) are fine.
            if (rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:')) {
                rest.url = null; // Will show default image on undo
            }
            return rest;
        });
    }

    if (result.stickers) {
        result.stickers = result.stickers.map(s => {
            const { sourceBlob, ...rest } = s;
            if (rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:')) {
                rest.url = null;
            }
            return rest;
        });
    }

    return result;
}

export async function saveState(state) {
    // Circuit breaker: skip saves during cooldown after repeated OOM failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        if (Date.now() < cooldownUntil) return;
        // Cooldown expired, reset and try again
        consecutiveFailures = 0;
    }

    // Coalesce: if a save is already pending, just update the state to save
    pendingSaveState = state;
    if (pendingSaveTimer) return;

    pendingSaveTimer = setTimeout(async () => {
        pendingSaveTimer = null;
        const stateToSave = pendingSaveState;
        pendingSaveState = null;

        try {
            // Strip heavy fields from ALL history entries (past/present/future)
            // Present gets lighter treatment (keep URLs, strip blobs)
            const cleanPresent = sanitizeState(stateToSave.present);
            if (cleanPresent?.panels) {
                cleanPresent.panels = cleanPresent.panels.map(p => {
                    const { sourceBlob, processedImage, processedDeepFryLevel, ...rest } = p;
                    return rest;
                });
            }
            if (cleanPresent?.stickers) {
                cleanPresent.stickers = cleanPresent.stickers.map(s => {
                    const { sourceBlob, ...rest } = s;
                    return rest;
                });
            }

            // Past/future get aggressive stripping (remove data URLs too)
            const cleanState = {
                ...stateToSave,
                present: cleanPresent,
                past: (stateToSave.past || []).map(stripHeavyFields),
                future: (stateToSave.future || []).map(stripHeavyFields),
            };

            // Size guard: estimate total size before attempting clone.
            // DataCloneError OOM happens when total exceeds ~50-100MB.
            const estimatedBytes = estimateSize(cleanState);
            if (estimatedBytes > 50_000_000) {
                console.warn(`State too large to save (~${(estimatedBytes / 1_000_000).toFixed(1)}MB), skipping`);
                // Trim history to reduce size and try once more
                cleanState.past = cleanState.past.slice(-3); // Keep only last 3
                cleanState.future = [];
                const reducedSize = estimateSize(cleanState);
                if (reducedSize > 50_000_000) {
                    console.warn('State still too large after trimming, aborting save');
                    return;
                }
            }

            if (useWorker && worker) {
                await sendRequest('SAVE_STATE', cleanState);
            } else {
                await saveStateFallback(cleanState);
            }

            // Success: reset circuit breaker
            consecutiveFailures = 0;
        } catch (err) {
            consecutiveFailures++;
            console.error(`Failed to save state (attempt ${consecutiveFailures}):`, err.message);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
                console.warn(`Save failed ${MAX_CONSECUTIVE_FAILURES} times, cooling down for ${FAILURE_COOLDOWN_MS / 1000}s`);
                return;
            }

            // Fallback: try main-thread save with even more aggressive trimming
            if (useWorker) {
                useWorker = false;
                try {
                    // Use the ALREADY SANITIZED state, not the raw one
                    const minimalState = {
                        ...stateToSave,
                        version: stateToSave.version || 2,
                        present: sanitizeState(stateToSave.present),
                        past: [],   // Drop history entirely for the emergency save
                        future: [],
                    };
                    // Strip blobs from present too
                    if (minimalState.present?.panels) {
                        minimalState.present.panels = minimalState.present.panels.map(p => {
                            const { sourceBlob, processedImage, processedDeepFryLevel, ...rest } = p;
                            return rest;
                        });
                    }
                    await saveStateFallback(minimalState);
                    consecutiveFailures = 0; // Fallback succeeded
                } catch (fallbackErr) {
                    console.error('Fallback save also failed:', fallbackErr.message);
                }
            }
        }
    }, 100);
}

export async function loadState() {
    // Strategy: Worker (attempt 1) -> Worker retry (attempt 2) -> Main-thread fallback
    // The worker itself responds in ~50ms, but the callback can be delayed 10s+
    // if the main thread is blocked by heavy libraries (e.g. Lottie).
    for (let attempt = 0; attempt < 2; attempt++) {
        if (!useWorker || !worker) break;
        try {
            const state = await sendRequest('LOAD_STATE');
            if (!state) return null;
            return processState(state);
        } catch (err) {
            if (attempt === 0) {
                console.warn('Storage worker attempt 1 failed, retrying...', err.message);
            } else {
                console.warn('Storage worker attempt 2 failed, falling back to main thread', err.message);
                useWorker = false;
            }
        }
    }

    // Main-thread fallback -- always works but blocks the thread briefly
    try {
        const state = await loadStateFallback();
        if (!state) return null;
        return processState(state);
    } catch (fallbackErr) {
        console.error('All storage load attempts failed:', fallbackErr);
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
