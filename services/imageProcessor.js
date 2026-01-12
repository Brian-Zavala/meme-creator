/**
 * Deep Frys an image using a Web Worker (OffscreenCanvas).
 * This runs completely off the main thread for "Ultra Mode" performance.
 */
export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  return new Promise(async (resolve, reject) => {
    // 0. Instant Abort Check: Don't spawn worker if already cancelled
    if (signal?.aborted) {
      return reject(new Error("Aborted"));
    }

    // 1. Prepare Worker
    const worker = new Worker(new URL('./deepFry.worker.js', import.meta.url), { type: 'module' });

    // Handle AbortSignal
    if (signal) {
      signal.addEventListener('abort', () => {
        worker.terminate();
        reject(new Error("Aborted"));
      });
    }

    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.success) {
        // PERF: Use ObjectURL (O(1)) instead of FileReader (O(N) + Main Thread Hang)
        const objectUrl = URL.createObjectURL(e.data.blob);
        resolve(objectUrl);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      console.error("Deep Fry Worker Error:", e);
      reject(e);
    };

    try {
      // 2. Load Image directly in Worker (Zero Main Thread Block)
      // We just pass the string. The worker fetches and decodes it.

      // Handle potential CORS/Cache issues for non-local images
      let finalSrc = imageSrc;
      const isLocal = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
      if (!isLocal) {
        finalSrc += (imageSrc.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      }

      // 3. Send to Worker
      worker.postMessage({ imageSrc: finalSrc, level });


    } catch (err) {
      worker.terminate();
      console.error("Deep Fry Setup Error:", err);
      // Fallback: If createImageBitmap fails (rare), reject or fallback to main thread?
      // For now, we reject to keep it clean.
      reject(err);
    }
  });
}
