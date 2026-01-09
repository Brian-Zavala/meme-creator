/**
 * Deep Frys an image using a Web Worker (OffscreenCanvas).
 * This runs completely off the main thread for "Ultra Mode" performance.
 */
export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  return new Promise(async (resolve, reject) => {
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
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(e.data.blob);
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
      // 2. Load Image & Create Bitmap (Efficient Transfer)
      const img = new Image();
      const isLocal = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
      if (!isLocal) {
        img.crossOrigin = "Anonymous";
        imageSrc += (imageSrc.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      }
      img.src = imageSrc;

      await new Promise((r, j) => {
        img.onload = r;
        img.onerror = () => j(new Error("Failed to load image for deep frying"));
      });

      // Resize logic (Same constraint as before to prevent crashes)
      const MAX_SIZE = 1500;
      let width = img.width;
      let height = img.height;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Create bitmap for the worker
      const imageBitmap = await createImageBitmap(img, { 
        resizeWidth: width, 
        resizeHeight: height 
      });

      // 3. Send to Worker
      worker.postMessage(
        { imageBitmap, level, width, height }, 
        [imageBitmap] // Transfer ownership! Zero-copy where possible.
      );

    } catch (err) {
      worker.terminate();
      console.error("Deep Fry Setup Error:", err);
      // Fallback: If createImageBitmap fails (rare), reject or fallback to main thread? 
      // For now, we reject to keep it clean.
      reject(err);
    }
  });
}
