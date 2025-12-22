import GIF from 'gif.js';
import { GifReader } from 'omggif';

/**
 * Exports a meme as an animated GIF
 * @param {Object} meme - The current meme state
 * @param {Array} texts - Array of text objects
 * @param {Array} stickers - Array of sticker objects
 * @returns {Promise<Blob>} - The exported GIF blob
 */
export async function exportGif(meme, texts, stickers) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Fetch the source GIF
      // We use the proxy if needed, but here we assume meme.imageUrl is already proxied or accessible
      const response = await fetch(meme.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 2. Read GIF frames
      const reader = new GifReader(uint8Array);
      const width = reader.width;
      const height = reader.height;
      const numFrames = reader.numFrames();

      // 3. Initialize GIF encoder
      const gif = new GIF({
        workers: 4,
        quality: 10,
        width: width,
        height: height,
        workerScript: '/gif.worker.js',
        repeat: 0 // 0 = loop forever, -1 = play once
      });

      // 4. Create a temporary canvas for drawing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      console.log(`Processing ${numFrames} frames for GIF export...`);

      // 5. Process each frame
      for (let i = 0; i < numFrames; i++) {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw original GIF frame
        const frameData = ctx.createImageData(width, height);
        reader.decodeAndBlitFrameRGBA(i, frameData.data);
        
        // Apply filters if any
        if (meme.filters) {
          const filterStr = `
            contrast(${meme.filters.contrast ?? 100}%) 
            brightness(${meme.filters.brightness ?? 100}%) 
            blur(${meme.filters.blur ?? 0}px)
            grayscale(${meme.filters.grayscale ?? 0}%)
            sepia(${meme.filters.sepia ?? 0}%)
            hue-rotate(${meme.filters.hueRotate ?? 0}deg)
            saturate(${meme.filters.saturate ?? 100}%)
            invert(${meme.filters.invert ?? 0}%)
          `.replace(/\s+/g, ' ').trim();
          ctx.filter = filterStr;
        }

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const fCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
        fCtx.putImageData(frameData, 0, 0);
        
        ctx.drawImage(frameCanvas, 0, 0);
        
        // Reset filter for overlays
        ctx.filter = 'none';

        // Draw Stickers
        for (const sticker of (stickers || [])) {
          const x = (sticker.x / 100) * width;
          const y = (sticker.y / 100) * height;
          const size = meme.stickerSize || 60;
          
          ctx.font = `${size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.url, x, y);
        }

        // Draw Texts
        for (const textItem of texts) {
          const x = (textItem.x / 100) * width;
          const y = (textItem.y / 100) * height;
          const fontSize = meme.fontSize || 40;
          const stroke = Math.max(1, fontSize / 25);
          
          ctx.font = `bold ${fontSize}px Impact, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const content = textItem.content.toUpperCase();
          
          ctx.strokeStyle = meme.textShadow || '#000000';
          ctx.lineWidth = stroke * 2;
          ctx.lineJoin = 'round';
          ctx.strokeText(content, x, y);
          
          ctx.fillStyle = meme.textColor || '#ffffff';
          ctx.fillText(content, x, y);
        }

        // Add to GIF
        const info = reader.frameInfo(i);
        // Delay is in centiseconds, convert to ms. Min 20ms for safety.
        const delay = Math.max(20, (info.delay || 10) * 10);
        gif.addFrame(canvas, { delay, copy: true });
      }

      // 6. Finalize
      gif.on('finished', (blob) => {
        resolve(blob);
      });

      gif.on('error', (err) => {
        reject(err);
      });

      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}
