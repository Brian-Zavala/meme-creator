import * as imgly from "@imgly/background-removal";

/**
 * Removes the background from an image URL or Blob
 * @param {string|Blob|File} imageSource - The image to process
 * @param {Function} onProgress - Callback for progress (0-1)
 * @returns {Promise<Blob>} - The processed image as a Blob (PNG)
 */
export async function removeImageBackground(imageSource, onProgress) {
  try {
    // 1. Resolve onnxruntime-web environment to disable multi-threading.
    // Multi-threading requires 'crossOriginIsolated' mode (headers COOP/COEP) 
    // which is not always available or configured.
    try {
        // imgly exports the 'ort' instance it uses internaly or we can use the peer dependency
        // We set it to 1 to force single-threading and avoid the 'Failed to fetch' worker errors.
        const ort = imgly.ort || (await import('onnxruntime-web'));
        if (ort && ort.env && ort.env.wasm) {
            ort.env.wasm.numThreads = 1;
        }
    } catch (e) {
        console.warn("Could not configure ONNX threading, falling back to default.", e);
    }

    // 2. Resolve the removal function
    const removeFn = imgly.removeBackground || (imgly.default && imgly.default.removeBackground);

    if (!removeFn) {
        throw new Error("Background removal module (removeBackground) not found in exports.");
    }

    const config = {
      model: 'isnet_quint8', 
      publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/',
      device: 'gpu',
      output: {
        quality: 1.0,
        type: 'foreground',
        format: 'image/png'
      },
      debug: true,
      progress: (key, current, total) => {
        if (onProgress) {
            const pct = (current / total);
            onProgress(pct); 
        }
      }
      // Removed outdated publicPath to allow default version-specific CDN resolution
    };

    const blob = await removeFn(imageSource, config);
    return blob;
  } catch (error) {
    console.error("Background Removal Error:", error);
    throw error;
  }
}
