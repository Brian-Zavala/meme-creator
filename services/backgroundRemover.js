
export async function removeImageBackground(imageSource, onProgress) {
  return new Promise((resolve, reject) => {
    // Instantiate the worker using Vite's worker import syntax
    const worker = new Worker(new URL('./background.worker.js', import.meta.url), {
      type: 'module',
    });

    const config = {
      // Points to: public/models/
      publicPath: window.location.origin + '/models/',
      model: 'isnet_fp16',
      debug: true,
    };

    worker.onmessage = (event) => {
      const { type, blob, progress, error } = event.data;

      if (type === 'progress') {
        if (onProgress) onProgress(progress);
      } else if (type === 'result') {
        worker.terminate();
        resolve(blob);
      } else if (type === 'error') {
        worker.terminate();
        console.error("Worker Background Removal Failed:", error);
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      console.error("Worker Error:", err);
      reject(err);
    };

    // Send the image source and config to the worker
    worker.postMessage({ imageSource, config });
  });
}

