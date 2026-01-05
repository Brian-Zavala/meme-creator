import { removeBackground } from "@imgly/background-removal";

export async function removeImageBackground(imageSource, onProgress) {
  try {
    const config = {
      // Points to: public/models/
      publicPath: window.location.origin + '/models/', 
      
      // Select the model we just downloaded
      model: 'isnet_fp16', 
      
      // Enable debug to see if it finds the files
      debug: true,
      
      progress: (key, current, total) => {
        if (onProgress) onProgress(current / total);
      }
    };

    return await removeBackground(imageSource, config);
  } catch (error) {
    console.error("Background Removal Failed:", error);
    throw error;
  }
}
