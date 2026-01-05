/**
 * Deep Frys an image using a Web Worker to prevent UI freezing.
 * @param {string} imageSrc - The source image URL.
 * @param {number} level - The level of frying (0-100).
 * @param {AbortSignal} [signal] - Optional signal to abort the worker.
 * @returns {Promise<string>} - Resolves to a Data URL (Blob URL) of the fried image.
 */
export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  return new Promise(async (resolve, reject) => {
    try {
      if (signal?.aborted) {
        return reject(new Error("Aborted"));
      }

      // 1. Load the image as a Blob first (handles CORS better for bitmaps)
      // Note: If imageSrc is already a blob URL, this works. If it's external, fetch needs CORS.
      const response = await fetch(imageSrc, { mode: 'cors', signal });
      if (!response.ok) throw new Error("Failed to fetch source image");
      const blob = await response.blob();

      // 2. Create ImageBitmap (transferable to worker)
      const imageBitmap = await createImageBitmap(blob);

      // 3. Initialize Worker
      const worker = new Worker('/deepfry.worker.js');

      if (signal) {
        signal.addEventListener('abort', () => {
          worker.terminate();
          reject(new Error("Aborted"));
        });
      }

      worker.onmessage = (e) => {
        if (e.data.success) {
          const url = URL.createObjectURL(e.data.blob);
          resolve(url);
        } else {
          reject(new Error(e.data.error));
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      // 4. Send to Worker
      // We transfer the ImageBitmap to avoid copying memory
      worker.postMessage({ imageBitmap, level }, [imageBitmap]);

    } catch (e) {
      console.error("Deep Fry Service Error:", e);
      reject(e);
    }
  });
}