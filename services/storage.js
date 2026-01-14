// Initialize Worker
const worker = new Worker(new URL('./storage.worker.js', import.meta.url), { type: 'module' });

// Request Tracker
let nextRequestId = 0;
const pendingRequests = new Map();

// Listen for responses
worker.onmessage = (e) => {
    const { id, type, payload, success, error } = e.data;
    const request = pendingRequests.get(id);

    if (request) {
        if (success) {
            request.resolve(payload);
        } else {
            console.error(`Storage Worker Error (${type}):`, error);
            request.reject(new Error(error));
        }
        pendingRequests.delete(id);
    }
};

function sendRequest(type, payload = null) {
    return new Promise((resolve, reject) => {
        const id = nextRequestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ type, payload, id });
    });
}

// Exported Facade
export async function saveState(state) {
    try {
        await sendRequest('SAVE_STATE', state);
    } catch (err) {
        console.error('Failed to save state via worker:', err);
    }
}

export async function loadState() {
    try {
        const state = await sendRequest('LOAD_STATE');
        if (!state) return null;

        // OPTIMIZATION: Inflate Blobs to Object URLs
        // This is instant and prevents Main Thread freezing compared to Base64 parsing
        const processItem = (item) => {
            if (item.url && item.url instanceof Blob) {
                // HYDRATION FIX: Keep reference to original Blob as 'sourceBlob'
                // This ensures subsequent saves (which read sourceBlob) work correctly.
                return {
                    ...item,
                    url: URL.createObjectURL(item.url),
                    sourceBlob: item.url
                };
            }
            return item;
        };

        if (state.panels) {
            state.panels = state.panels.map(processItem);
        }
        if (state.stickers) {
            state.stickers = state.stickers.map(processItem);
        }

        return state;
    } catch (err) {
        console.error('Failed to load state via worker:', err);
        return null;
    }
}
