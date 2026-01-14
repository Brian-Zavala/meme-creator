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
        return await sendRequest('LOAD_STATE');
    } catch (err) {
        console.error('Failed to load state via worker:', err);
        return null;
    }
}
