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
        quality: 1, // Higher quality
        width: width,
        height: height,
        workerScript: '/gif.worker.js',
        repeat: 0,
        background: '#000000',
        transparent: null,
        dither: 'FloydSteinberg'
      });

      console.log(`Processing ${numFrames} frames for GIF export...`);

      // -- Setup Canvases --
      
      // A. Video State Canvas: Tracks the underlying GIF video (composition of frames)
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = width;
      videoCanvas.height = height;
      const videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true });
      
      // B. Render Canvas: The final composite for each frame (Video + Filters + Text)
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = width;
      renderCanvas.height = height;
      const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });

      // C. Helper for decoding raw frames
      const rawFrameData = new Uint8ClampedArray(width * height * 4);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');

      // State for disposal handling
      let previousInfo = null;
      let savedState = null; // For disposal = 3 (Restore to Previous)

      // 4. Process each frame
      for (let i = 0; i < numFrames; i++) {
        const info = reader.frameInfo(i);
        
        // --- Disposal Handling (Cleanup from PREVIOUS frame) ---
        // We must dispose of frame (i-1) before drawing frame (i)
        if (i > 0 && previousInfo) {
            const { disposal, x, y, width: fWidth, height: fHeight } = previousInfo;
            
            if (disposal === 2) {
                // Restore to Background (Clear the rect of the previous frame)
                videoCtx.clearRect(x, y, fWidth, fHeight);
            } else if (disposal === 3 && savedState) {
                // Restore to Previous (Put back the state from before the previous frame)
                videoCtx.putImageData(savedState, 0, 0);
            }
            // Disposal 0 or 1 means "Keep" (Do nothing)
        }

        // --- Save State (If CURRENT frame needs to be undone later) ---
        // If THIS frame's disposal is 3, we need to save the CURRENT canvas state 
        // *before* we draw this frame, so we can restore it when we get to the *next* frame.
        if (info.disposal === 3) {
            savedState = videoCtx.getImageData(0, 0, width, height);
        }

        // --- Decode & Draw Current Frame ---
        // 1. Clear the raw data buffer for the new frame
        rawFrameData.fill(0);
        
        // 2. Decode pixels into the buffer
        // decodeAndBlitFrameRGBA writes pixels for the frame into the buffer.
        // It handles the frame's x/y offsets implicitly if we pass a full-sized buffer.
        reader.decodeAndBlitFrameRGBA(i, rawFrameData);

        // 3. Put this frame's delta onto a temp canvas
        const frameImageData = new ImageData(rawFrameData, width, height);
        tempCtx.putImageData(frameImageData, 0, 0);

        // 4. Composite onto the video state canvas
        // This layers the new frame over the persisting background/previous frame
        videoCtx.drawImage(tempCanvas, 0, 0);
        
        // Update previous info for the next loop
        previousInfo = info;


        // --- Final Composition (Video + Effects + Text) ---
        
        // 1. Clear Render Canvas
        renderCtx.clearRect(0, 0, width, height);
        
        // 2. Draw the Video State
        renderCtx.drawImage(videoCanvas, 0, 0);
        
        // 3. Apply Filters
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
          
          if (filterStr !== 'none') {
             // Create a temp canvas for filtering to avoid self-referential drawing issues
             const fCanvas = document.createElement('canvas');
             fCanvas.width = width;
             fCanvas.height = height;
             const fCtx = fCanvas.getContext('2d');
             
             fCtx.filter = filterStr;
             fCtx.drawImage(renderCanvas, 0, 0);
             
             // Copy back
             renderCtx.clearRect(0, 0, width, height);
             renderCtx.drawImage(fCanvas, 0, 0);
          }
        }

        // 4. Draw Stickers
        for (const sticker of (stickers || [])) {
          const x = (sticker.x / 100) * width;
          const y = (sticker.y / 100) * height;
          const size = meme.stickerSize || 60;
          
          renderCtx.font = `${size}px sans-serif`;
          renderCtx.textAlign = 'center';
          renderCtx.textBaseline = 'middle';
          renderCtx.fillText(sticker.url, x, y);
        }

        // 5. Draw Texts
        for (const textItem of texts) {
          if (!textItem.content.trim()) continue;

          const x = (textItem.x / 100) * width;
          const y = (textItem.y / 100) * height;
          const fontSize = meme.fontSize || 40;
          const stroke = Math.max(1, fontSize / 25);
          const rotation = (textItem.rotation || 0) * (Math.PI / 180);

          renderCtx.save();
          renderCtx.translate(x, y);
          renderCtx.rotate(rotation);
          
          renderCtx.font = `bold ${fontSize}px ${meme.fontFamily || 'Impact'}, sans-serif`;
          renderCtx.textAlign = 'center';
          renderCtx.textBaseline = 'middle';
          
          renderCtx.shadowColor = 'rgba(0,0,0,0.8)';
          renderCtx.shadowBlur = 4;
          renderCtx.shadowOffsetY = 2;

          const content = textItem.content.toUpperCase();
          const metrics = renderCtx.measureText(content);
          
          if (meme.textBgColor && meme.textBgColor !== 'transparent') {
            const bgWidth = metrics.width + (fontSize * 0.4);
            const bgHeight = fontSize * 1.2;
            
            renderCtx.fillStyle = meme.textBgColor;
            const radius = fontSize * 0.15;
            const bx = -bgWidth / 2;
            const by = -bgHeight / 2;
            
            renderCtx.beginPath();
            renderCtx.moveTo(bx + radius, by);
            renderCtx.lineTo(bx + bgWidth - radius, by);
            renderCtx.quadraticCurveTo(bx + bgWidth, by, bx + bgWidth, by + radius);
            renderCtx.lineTo(bx + bgWidth, by + bgHeight - radius);
            renderCtx.quadraticCurveTo(bx + bgWidth, by + bgHeight, bx + bgWidth - radius, by + bgHeight);
            renderCtx.lineTo(bx + radius, by + bgHeight);
            renderCtx.quadraticCurveTo(bx, by + bgHeight, bx, by + bgHeight - radius);
            renderCtx.lineTo(bx, by + radius);
            renderCtx.quadraticCurveTo(bx, by, bx + radius, by);
            renderCtx.closePath();
            renderCtx.fill();
          }
          
          renderCtx.lineWidth = stroke * 2;
          renderCtx.lineJoin = 'round';
          
          renderCtx.strokeStyle = meme.textShadow || '#000000';
          renderCtx.strokeText(content, 0, 0);

          renderCtx.fillStyle = meme.textColor || '#ffffff';
          renderCtx.fillText(content, 0, 0);

          renderCtx.shadowColor = 'transparent';
          renderCtx.shadowBlur = 0;
          renderCtx.shadowOffsetY = 0;
          
          renderCtx.restore();
        }

        // Add to GIF
        // info.delay is in 1/100ths of a second. Math.max(20, ...) ensures we don't have 0ms frames.
        const delay = Math.max(20, (info.delay || 10) * 10);
        gif.addFrame(renderCtx, { delay, copy: true });
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
