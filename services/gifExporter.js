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
        quality: 1, // Higher quality (lower number) to reduce artifacts
        width: width,
        height: height,
        workerScript: '/gif.worker.js',
        repeat: 0,
        background: '#000000',
        transparent: null, // Explicitly disable transparency to fix black speckles
        dither: 'FloydSteinberg' // Better color blending
      });

      // 4. Create a temporary canvas for drawing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      console.log(`Processing ${numFrames} frames for GIF export...`);

      // 5. Process each frame
      for (let i = 0; i < numFrames; i++) {
        // Clear canvas with solid black to prevent transparency artifacts (speckles)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Decode raw frame data
        const frameData = ctx.createImageData(width, height);
        reader.decodeAndBlitFrameRGBA(i, frameData.data);
        
        // Create a temporary canvas to hold the raw frame (with transparency)
        // We do this because putImageData overwrites pixels (ignoring alpha blending).
        // By putting it on a temp canvas first, we can then drawImage it onto the main canvas,
        // which RESPECTS alpha blending and composites it over our black background.
        const rawFrameCanvas = document.createElement('canvas');
        rawFrameCanvas.width = width;
        rawFrameCanvas.height = height;
        const rawCtx = rawFrameCanvas.getContext('2d');
        rawCtx.putImageData(frameData, 0, 0);

        // Draw the raw frame onto the main canvas (compositing over black)
        ctx.drawImage(rawFrameCanvas, 0, 0);

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
          
          // Apply filters using a second temp canvas to avoid self-referential drawing issues
          const filteredCanvas = document.createElement('canvas');
          filteredCanvas.width = width;
          filteredCanvas.height = height;
          const fCtx = filteredCanvas.getContext('2d');
          fCtx.filter = filterStr;
          fCtx.drawImage(canvas, 0, 0);
          
          // Draw filtered result back to main canvas
          ctx.drawImage(filteredCanvas, 0, 0);
          
          // Reset filter
          ctx.filter = 'none';
        }

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
          if (!textItem.content.trim()) continue;

          const x = (textItem.x / 100) * width;
          const y = (textItem.y / 100) * height;
          const fontSize = meme.fontSize || 40;
          const stroke = Math.max(1, fontSize / 25);
          
          ctx.font = `bold ${fontSize}px Impact, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const content = textItem.content.toUpperCase();
          const metrics = ctx.measureText(content);
          
          // Draw Text Background if enabled
          if (meme.textBgColor && meme.textBgColor !== 'transparent') {
            const bgWidth = metrics.width + (fontSize * 0.4);
            const bgHeight = fontSize * 1.2;
            
            ctx.fillStyle = meme.textBgColor;
            // Draw a rounded rectangle for the background
            const radius = fontSize * 0.15; // Proportional radius
            const bx = x - bgWidth / 2;
            const by = y - bgHeight / 2;
            
            ctx.beginPath();
            ctx.moveTo(bx + radius, by);
            ctx.lineTo(bx + bgWidth - radius, by);
            ctx.quadraticCurveTo(bx + bgWidth, by, bx + bgWidth, by + radius);
            ctx.lineTo(bx + bgWidth, by + bgHeight - radius);
            ctx.quadraticCurveTo(bx + bgWidth, by + bgHeight, bx + bgWidth - radius, by + bgHeight);
            ctx.lineTo(bx + radius, by + bgHeight);
            ctx.quadraticCurveTo(bx, by + bgHeight, bx, by + bgHeight - radius);
            ctx.lineTo(bx, by + radius);
            ctx.quadraticCurveTo(bx, by, bx + radius, by);
            ctx.closePath();
            ctx.fill();
          }
          
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
        
        // Capture the pixels ourselves using the optimized context
        const finalImageData = ctx.getImageData(0, 0, width, height);
        gif.addFrame(finalImageData, { delay, copy: true });
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
