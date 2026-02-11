
// Storage service using Dexie.js for robust, main-thread async storage
// Replaces the crash-prone Worker implementation.

import { db } from './db';

const KEY = 'meme-generator-state';

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
            // Keep sourceBlob for undo history!
            // Only strip derived/cached data
            const { processedImage, processedDeepFryLevel, ...rest } = p;

            // Strip data URLs (strings) - they are the memory killers.
            // Blobs are fine (handled by reference/disk).
            if (rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:')) {
                rest.url = null;
            }
            return rest;
        });
    }

    if (result.stickers) {
        result.stickers = result.stickers.map(s => {
            const { processedImage, ...rest } = s;
            if (rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:')) {
                rest.url = null;
            }
            return rest;
        });
    }

    return result;
}

export async function saveState(state) {
    // Coalesce: if a save is already pending, just update the state to save
    pendingSaveState = state;
    if (pendingSaveTimer) return;

    pendingSaveTimer = setTimeout(async () => {
        pendingSaveTimer = null;
        const stateToSave = pendingSaveState;
        pendingSaveState = null;

        try {
            // Clean present state:
            // 1. Keep sourceBlob (CRITICAL: used to restore image on reload since blob: URLs expire)
            // 2. Strip processedImage (temporary cache, can be regenerated)
            // 3. Strip deepFry level (reset on reload)

            // Helper to safely process items: Convert Data URL to Blob if sourceBlob is missing
            const processItemSafe = async (item) => {
                const { processedImage, processedDeepFryLevel, ...rest } = item;

                // If we have a Data URL string but NO sourceBlob, we must generate one
                // before we strip the URL, otherwise the image is lost forever.
                if (rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:')) {
                    if (!rest.sourceBlob) {
                         try {
                             const res = await fetch(rest.url);
                             const blob = await res.blob();
                             rest.sourceBlob = blob;
                         } catch (e) {
                             console.warn("Failed to convert Data URL to Blob for save:", e);
                         }
                    }
                    // Now it is safe to strip the heavy string
                    rest.url = null;
                }
                return rest;
            };

            const cleanPresent = sanitizeState(stateToSave.present);

            if (cleanPresent?.panels) {
                // Use Promise.all to handle async blob conversion
                cleanPresent.panels = await Promise.all(cleanPresent.panels.map(processItemSafe));
            }
            if (cleanPresent?.stickers) {
                cleanPresent.stickers = await Promise.all(cleanPresent.stickers.map(processItemSafe));
            }

            // Past/future: Strip heavy fields but TRY to keep sourceBlob if possible?
            // Actually, for history, if we strip sourceBlob, Undo -> breaks image after reload.
            // But preserving 15 blobs is heavy?
            // IndexedDB handles blobs by reference usually.
            // The constraint is 'postMessage' memory.
            // Let's keep sourceBlob in history too, but strip DATA URLs (strings).
            const cleanState = {
                ...stateToSave,
                present: cleanPresent,
                past: (stateToSave.past || []).map(stripHeavyFields),
                future: (stateToSave.future || []).map(stripHeavyFields),
            };

            // Dexie handles Blobs efficiently (storing by reference on disk mostly),
            // so we don't need to be AS aggressive as with workers, but keeping history trim is good.
            // Size guard (~50MB limit)
            const estimatedBytes = estimateSize(cleanState);
            if (estimatedBytes > 100_000_000) { // Bumped to 100MB for Dexie
                console.warn(`State too large (~${(estimatedBytes / 1_000_000).toFixed(1)}MB), trimming history`);
                cleanState.past = cleanState.past.slice(-5);
                cleanState.future = [];
            }

            // Save via Dexie
            await db.appState.put(cleanState, KEY);

        } catch (err) {
            console.error(`Failed to save state via Dexie:`, err.message);
            // Non-fatal, just log. Most likely quota or corrupt object.
        }
    }, 100);
}

export async function loadState() {
    try {
        // Load via Dexie
        const state = await db.appState.get(KEY);
        if (!state) return null;
        return processState(state);
    } catch (err) {
        console.error('CRITICAL: Failed to load storage via Dexie.', err);
        // Fallback: Wipe DB if corrupted beyond repair
        try {
            console.warn('Wiping Dexie DB to recover from corruption...');
            await db.delete();
            await db.open(); // Re-open fresh
        } catch (wipeErr) {
            console.error('Failed to wipe DB:', wipeErr);
        }
        return null;
    }
}

// Helper to inflate Blobs to Object URLs (shared logic)
function processState(state) {
    if (!state) return null;

    const processItem = (item) => {
        // Recover URL from sourceBlob if missing (stripped due to size)
        if (item.sourceBlob instanceof Blob) {
            if (!item.url || item.url instanceof Blob) {
                return {
                    ...item,
                    url: URL.createObjectURL(item.sourceBlob),
                    sourceBlob: item.sourceBlob
                };
            }
        }

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
