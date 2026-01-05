import * as imgly from "@imgly/background-removal";

/**
 * Removes the background from an image URL or Blob
 * @param {string|Blob|File} imageSource - The image to process
 * @param {Function} onProgress - Callback for progress (0-1)
 * @returns {Promise<Blob>} - The processed image as a Blob (PNG)
 */
export async function removeImageBackground(imageSource, onProgress) {
  try {
    // Some environments might wrap the module in a default export (Vite pre-bundling)
    // while others provide named exports directly (Production build)
    const removeFn = imgly.removeBackground || (imgly.default && imgly.default.removeBackground);

    if (!removeFn) {
        throw new Error("Background removal module (removeBackground) not found in exports.");
    }

    const config = {
      model: 'isnet_quint8', // Faster (~40MB) and more robust for diverse environments
      publicPath: 'https://unpkg.com/@imgly/background-removal-data@1.7.0/dist/',
      device: 'gpu',
      output: {
        quality: 1.0,      // Maximize output quality
        type: 'foreground',
        format: 'image/png'
      },
      debug: true,         // Enable logging for troubleshooting
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
