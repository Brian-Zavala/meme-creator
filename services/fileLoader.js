
// Facade for Upload Worker
const worker = new Worker(new URL('./upload.worker.js', import.meta.url), { type: 'module' });

let nextRequestId = 0;
const pendingRequests = new Map();

worker.onmessage = (e) => {
    const { id, success, dataUrl, error } = e.data;
    const request = pendingRequests.get(id);

    if (request) {
        if (success) {
            request.resolve(dataUrl);
        } else {
            request.reject(new Error(error));
        }
        pendingRequests.delete(id);
    }
};

export function processFileInWorker(file) {
    return new Promise((resolve, reject) => {
        const id = nextRequestId++;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ file, id });
    });
}
