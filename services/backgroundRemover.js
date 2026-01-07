
export async function removeImageBackground(imageSource, onProgress) {
  return new Promise((resolve, reject) => {
    // Instantiate the worker using Vite's worker import syntax
    // V2.0.1 - Force worker hash change to bust cache on mobile devices
    const worker = new Worker(new URL('./background.worker.js', import.meta.url), {
      type: 'module',
    });

    const config = {
      // Points to: public/models/
      publicPath: window.location.origin + '/models/',
      model: 'isnet_fp16',
      debug: true,
    };

    // Timeout for very slow devices (60 seconds)
    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error("Background removal timed out. Device may be too slow or offline."));
    }, 60000);


    worker.onmessage = (event) => {
      const { type, blob, progress, error, usedFallback } = event.data;

      if (type === 'progress') {
        if (onProgress) onProgress(progress);
      } else if (type === 'result') {
        clearTimeout(timeoutId);
        worker.terminate();
        if (usedFallback) {
          console.info("Background removal completed using CPU fallback");
        }
        resolve(blob);
      } else if (type === 'error') {
        clearTimeout(timeoutId);
        worker.terminate();
        console.error("Worker Background Removal Failed:", error);
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      worker.terminate();
      console.error("Worker Error:", err);
      reject(err);
    };

    // Send the image source and config to the worker
    worker.postMessage({ imageSource, config });
  });
}

