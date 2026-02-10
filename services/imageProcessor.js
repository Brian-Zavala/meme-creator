/**
 * Applies deep fry effect to an image using a persistent Web Worker
 * Reuses a single worker instance to avoid repeated creation/teardown overhead
 */

// Persistent worker instance — created once, reused across all calls
let persistentWorker = null;
let pendingResolve = null;
let pendingReject = null;

function getWorker() {
  if (!persistentWorker) {
    persistentWorker = new Worker(new URL('./deepFry.worker.js', import.meta.url), { type: 'module' });

    persistentWorker.onmessage = (e) => {
      if (pendingResolve) {
        if (e.data.success) {
          const objectUrl = URL.createObjectURL(e.data.blob);
          pendingResolve(objectUrl);
        } else {
          pendingReject(new Error(e.data.error));
        }
        pendingResolve = null;
        pendingReject = null;
      }
    };

    persistentWorker.onerror = (e) => {
      console.error("Deep Fry Worker Error:", e);
      if (pendingReject) {
        pendingReject(e);
        pendingResolve = null;
        pendingReject = null;
      }
      // Worker is broken — allow recreation on next call
      persistentWorker = null;
    };
  }
  return persistentWorker;
}

export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    const worker = getWorker();

    // Cancel any in-flight request
    if (pendingReject) {
      pendingReject(new DOMException("Superseded", "AbortError"));
    }

    pendingResolve = resolve;
    pendingReject = reject;

    if (signal) {
      const onAbort = () => {
        if (pendingReject === reject) {
          pendingReject(new DOMException("Aborted", "AbortError"));
          pendingResolve = null;
          pendingReject = null;
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Handle CORS/Cache issues for non-local images
    let finalSrc = imageSrc;
    const isLocal = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
    if (!isLocal) {
      if (finalSrc.startsWith('http:')) {
        finalSrc = finalSrc.replace('http:', 'https:');
      }
      finalSrc += (imageSrc.includes('?') ? '&' : '?') + `t=${Date.now()}`;
    }

    worker.postMessage({ imageSrc: finalSrc, level });
  });
}
