/**
 * Applies deep fry effect to an image using a Web Worker for off-main-thread processing
 */
export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  return new Promise(async (resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Aborted"));
    }

    const worker = new Worker(new URL('./deepFry.worker.js', import.meta.url), { type: 'module' });


    if (signal) {
      signal.addEventListener('abort', () => {
        worker.terminate();
        reject(new DOMException("Aborted", "AbortError"));
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
      // Handle CORS/Cache issues for non-local images
      let finalSrc = imageSrc;
      const isLocal = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
      if (!isLocal) {
        finalSrc += (imageSrc.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      }

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
