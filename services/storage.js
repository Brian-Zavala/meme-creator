
// Storage service using Dexie.js for robust, main-thread async storage
// Normalized Architecture: Assets (Blobs) are stored separately from AppState to prevent OOM.

import { db } from './db';

const KEY = 'meme-generator-state';

// ============================================
// EXPORTED API
// ============================================

/**
 * Sanitizes state object to ensure it is structured cloneable (serializable)
 */
function sanitizeState(data) {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') {
        if (typeof data === 'function' || typeof data === 'symbol') return undefined;
        return data;
    }
    if (data instanceof Blob || data instanceof File || data instanceof ArrayBuffer) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(sanitizeState);
    }
    const sanitized = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
             if (key.startsWith('_') || key.startsWith('$')) continue;
             const value = data[key];
             if (value instanceof Element || value instanceof Node) continue;
             const cleanValue = sanitizeState(value);
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
    pendingSaveState = state;
    if (pendingSaveTimer) return;

    pendingSaveTimer = setTimeout(async () => {
        pendingSaveTimer = null;
        const stateToSave = pendingSaveState;
        pendingSaveState = null;

        try {
            // 1. Prepare clean minimal state
            const cleanPresent = sanitizeState(stateToSave.present);

            // 2. Normalize Assets: Extract Blobs to separate store
            const assetsToSave = [];

            // Helper to process items: Extract Blob -> Asset Store reference
            const processItemExtractAssets = async (item) => {
                const { processedImage, processedDeepFryLevel, ...rest } = item;

                // A. Ensure we have a Blob (Recover from Data/Blob URL if needed)
                const isDataUrl = rest.url && typeof rest.url === 'string' && rest.url.startsWith('data:');
                const isBlobUrl = rest.url && typeof rest.url === 'string' && rest.url.startsWith('blob:');

                if (isDataUrl || isBlobUrl) {
                    if (!rest.sourceBlob) {
                         try {
                             const res = await fetch(rest.url);
                             const blob = await res.blob();
                             rest.sourceBlob = blob;
                         } catch (e) {
                             console.warn("Failed to convert URL to Blob for save:", e);
                         }
                    }
                    rest.url = null; // Strip string
                }

                // B. If we have a sourceBlob, extract it!
                if (rest.sourceBlob instanceof Blob) {
                    // Use item.id as assetId if available, or generate one (though item.id should be unique)
                    // We suffix with '-asset' to avoid confusion if IDs are reused contextually,
                    // but usually 1:1 mapping is fine. Let's use item.id for simplicity + 'v1' salt if needed?
                    // Actually, multiple panels could technically overwrite if they share ID? No, IDs are UUIDs.
                    const assetId = rest.id;

                    assetsToSave.push({ id: assetId, blob: rest.sourceBlob });

                    // Replace Blob with lightweight reference
                    rest.assetId = assetId;
                    delete rest.sourceBlob; // Remove heavy blob from main object
                }

                return rest;
            };

            if (cleanPresent?.panels) {
                cleanPresent.panels = await Promise.all(cleanPresent.panels.map(processItemExtractAssets));
            }
            if (cleanPresent?.stickers) {
                cleanPresent.stickers = await Promise.all(cleanPresent.stickers.map(processItemExtractAssets));
            }

            // 3. Save Assets to 'assets' store
            // We use bulkPut for performance
            if (assetsToSave.length > 0) {
                await db.assets.bulkPut(assetsToSave);
            }

            // 4. Save Lightweight State to 'appState'
            const cleanState = {
                ...stateToSave,
                present: cleanPresent,
                past: [],   // No history persistence
                future: [],
                version: 2
            };

            await db.appState.put(cleanState, KEY);

        } catch (err) {
            console.error(`Failed to save state via Dexie:`, err.message);
        }
    }, 100);
}

export async function loadState() {
    try {
        // 1. Load Lightweight State
        const state = await db.appState.get(KEY);
        if (!state) return null;

        // 2. Denormalize: Fetch Assets and Rehydrate
        return await hydrateState(state);

    } catch (err) {
        console.error('CRITICAL: Failed to load storage via Dexie.', err);
        return null;
    }
}

async function hydrateState(state) {
    if (!state) return null;

    // Collect all asset IDs needed
    const assetIds = new Set();
    const collectIds = (list) => {
        if (!list) return;
        list.forEach(item => {
            if (item.assetId) assetIds.add(item.assetId);
        });
    };

    if (state.present) {
        collectIds(state.present.panels);
        collectIds(state.present.stickers);
    }
    // Handle legacy V1 structure just in case (though we migrate)
    collectIds(state.panels);
    collectIds(state.stickers);

    // Bulk fetch assets
    const assetsMap = new Map();
    if (assetIds.size > 0) {
        try {
            const idsArray = Array.from(assetIds);
            const assets = await db.assets.bulkGet(idsArray);

            assets.forEach((asset, index) => {
                if (asset && asset.blob) {
                    assetsMap.set(idsArray[index], asset.blob);
                }
            });
        } catch (e) {
            console.warn("Failed to load some assets:", e);
        }
    }

    // Helper to inject Blobs back into items
    const rehydrateItem = (item) => {
        let blob = null;

        // Strategy 1: Fetch from separate asset store (Normalization V2)
        if (item.assetId && assetsMap.has(item.assetId)) {
            blob = assetsMap.get(item.assetId);
        }
        // Strategy 2: Legacy fallback (Embedded Blob)
        else if (item.sourceBlob instanceof Blob) {
            blob = item.sourceBlob;
        }

        if (blob) {
            return {
                ...item,
                sourceBlob: blob,
                url: URL.createObjectURL(blob) // Regenerate fresh URL
            };
        }

        // Handling missing assets / strings
        // If url is a string, check if it's a stale blob: URL.
        const isStaleBlobString = typeof item.url === 'string' && item.url.startsWith('blob:');
        if (isStaleBlobString) {
             // Broken link (no blob found). Return as is (will probably show broken img)
             // or could replace with placeholder?
             // For now, return item; UI handles broken images.
             return item;
        }

        return item;
    };

    const processSingleState = (s) => {
        if (!s) return s;
        const next = { ...s };
        if (next.panels) next.panels = next.panels.map(rehydrateItem);
        if (next.stickers) next.stickers = next.stickers.map(rehydrateItem);
        return next;
    };

    if (state.version === 2 && state.present) {
        const present = processSingleState(state.present);
        return {
            ...state,
            past: [],
            present,
            future: []
        };
    }

    return processSingleState(state);
}
