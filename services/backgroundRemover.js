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
      model: 'isnet', // Use highest accuracy model (float32)
      output: {
        quality: 1.0
      },
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
