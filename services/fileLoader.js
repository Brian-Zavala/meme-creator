// File Upload service with robust error handling and worker fallback
// Handles reading files as Data URLs off the main thread when possible

// Timeout for worker operations (10 seconds - file reading can be slow)
const WORKER_TIMEOUT_MS = 10000;

// Track if we're using the worker or fallback mode
let useWorker = true;
let worker = null;

let nextRequestId = 0;
const pendingRequests = new Map();

/**
 * Initialize worker with error handling
 * Falls back to main-thread implementation if workers fail
 */
function initWorker() {
    try {
        worker = new Worker(new URL('./upload.worker.js', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
            const { id, success, dataUrl, error } = e.data;
            const request = pendingRequests.get(id);

            if (request) {
                clearTimeout(request.timeoutId);
                if (success) {
                    request.resolve(dataUrl);
                } else {
                    request.reject(new Error(error));
                }
                pendingRequests.delete(id);
            }
        };

        worker.onerror = (e) => {
            console.error('Upload worker error:', e);
            useWorker = false;
            // Reject all pending requests so they can retry with fallback
            pendingRequests.forEach((request, id) => {
                clearTimeout(request.timeoutId);
                request.reject(new Error('Worker crashed'));
                pendingRequests.delete(id);
            });
        };
    } catch (err) {
        console.warn('Failed to initialize upload worker, using fallback:', err);
        useWorker = false;
    }
}

// Initialize worker on load
initWorker();

/**
 * Fallback: Read file on main thread
 * Used when workers are unavailable
 */
function readFileOnMainThread(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            resolve(reader.result);
        };
        
        reader.onerror = () => {
            reject(new Error(reader.error?.message || 'Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Process file - tries worker first, falls back to main thread
 * @param {File} file - The file to process
 * @returns {Promise<string>} - Data URL of the file
 */
export function processFileInWorker(file) {
    return new Promise((resolve, reject) => {
        // Try worker first if available
        if (useWorker && worker) {
            const id = nextRequestId++;
            
            // Set timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                    console.warn('Upload worker timed out, falling back to main thread');
                    // Fall back to main thread on timeout
                    readFileOnMainThread(file).then(resolve).catch(reject);
                }
            }, WORKER_TIMEOUT_MS);

            pendingRequests.set(id, { resolve, reject, timeoutId });
            
            try {
                worker.postMessage({ file, id });
            } catch (postError) {
                // postMessage can fail if file is too large or worker is dead
                clearTimeout(timeoutId);
                pendingRequests.delete(id);
                console.warn('Failed to post to worker, using fallback:', postError);
                readFileOnMainThread(file).then(resolve).catch(reject);
            }
        } else {
            // Use fallback directly
            readFileOnMainThread(file).then(resolve).catch(reject);
        }
    });
}
