import { removeBackground } from "@imgly/background-removal";

/**
 * Removes the background from an image URL or Blob
 * @param {string|Blob|File} imageSource - The image to process
 * @param {Function} onProgress - Callback for progress (0-1)
 * @returns {Promise<Blob>} - The processed image as a Blob (PNG)
 */
export async function removeImageBackground(imageSource, onProgress) {
  try {
    const config = {
      progress: (key, current, total) => {
        if (onProgress) {
            // Map the various stages to a 0-100% progress roughly
            // fetch: 0-20%, compute: 20-100%
            const pct = (current / total);
            onProgress(pct); 
        }
      },
      // Ensure we use the public assets (need to copy them to public folder usually, 
      // but imgly defaults to fetching from CDN if not found)
      // We will let it fetch from unpkg/cdn for now to avoid massive local asset copying logic
      // unless we configure vite to copy them.
      publicPath: "https://static.img.ly/background-removal-data/1.0.0/" 
    };

    const blob = await removeBackground(imageSource, config);
    return blob;
  } catch (error) {
    console.error("Background Removal Error:", error);
    throw error;
  }
}
