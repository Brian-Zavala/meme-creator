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
      const originalWidth = reader.width;
      const originalHeight = reader.height;
      const numFrames = reader.numFrames();

      // Layout Calculations
      const paddingTop = meme.paddingTop || 0;
      const exportWidth = originalWidth;
      const exportHeight = paddingTop > 0 ? Math.round(originalHeight / ((100 - paddingTop) / 100)) : originalHeight;
      const videoOffsetY = paddingTop > 0 ? exportHeight * (paddingTop / 100) : 0;

      // 3. Initialize GIF encoder
      const gif = new GIF({
        workers: 4,
        quality: 1, // Higher quality
        width: exportWidth,
        height: exportHeight,
        workerScript: '/gif.worker.js',
        repeat: 0,
        background: paddingTop > 0 ? '#ffffff' : '#000000',
        transparent: null,
        dither: 'FloydSteinberg'
      });

      console.log(`Processing ${numFrames} frames for GIF export...`);

      // 3.5 Pre-load image stickers
      const loadedImages = {};
      await Promise.all((stickers || []).filter(s => s.type === 'image').map(s => new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => { loadedImages[s.id] = img; resolve(); };
          img.onerror = () => resolve(); 
          img.src = s.url;
      })));

      // -- Setup Canvases --
      
      // A. Video State Canvas: Tracks the underlying GIF video (composition of frames)
      // MUST match original GIF dimensions
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = originalWidth;
      videoCanvas.height = originalHeight;
      const videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true });
      
      // B. Render Canvas: The final composite for each frame (Video + Filters + Text)
      // Matches EXPORT dimensions
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = exportWidth;
      renderCanvas.height = exportHeight;
      const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });

      // C. Helper for decoding raw frames
      const rawFrameData = new Uint8ClampedArray(originalWidth * originalHeight * 4);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalWidth;
      tempCanvas.height = originalHeight;
      const tempCtx = tempCanvas.getContext('2d');

      // State for disposal handling
      let previousInfo = null;
      let savedState = null; // For disposal = 3 (Restore to Previous)

      // 4. Process each frame
      for (let i = 0; i < numFrames; i++) {
        // Yield to main thread every 5 frames to prevent UI freeze
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));

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
            savedState = videoCtx.getImageData(0, 0, originalWidth, originalHeight);
        }

        // --- Decode & Draw Current Frame ---
        // 1. Clear the raw data buffer for the new frame
        rawFrameData.fill(0);
        
        // 2. Decode pixels into the buffer
        // decodeAndBlitFrameRGBA writes pixels for the frame into the buffer.
        // It handles the frame's x/y offsets implicitly if we pass a full-sized buffer.
        reader.decodeAndBlitFrameRGBA(i, rawFrameData);

        // 3. Put this frame's delta onto a temp canvas
        const frameImageData = new ImageData(rawFrameData, originalWidth, originalHeight);
        tempCtx.putImageData(frameImageData, 0, 0);

        // 4. Composite onto the video state canvas
        // This layers the new frame over the persisting background/previous frame
        videoCtx.drawImage(tempCanvas, 0, 0);
        
        // Update previous info for the next loop
        previousInfo = info;


        // --- Final Composition (Video + Effects + Text) ---
        
        // 1. Clear Render Canvas and Fill Background
        renderCtx.clearRect(0, 0, exportWidth, exportHeight);
        if (paddingTop > 0) {
            renderCtx.fillStyle = '#ffffff';
            renderCtx.fillRect(0, 0, exportWidth, exportHeight);
        }
        
        // 2. Draw the Video State (with Offset)
        renderCtx.drawImage(videoCanvas, 0, videoOffsetY);
        
        // 3. Apply Filters (Only to the video part? Or whole canvas?)
        // Currently it applies to renderCanvas.
        // If we apply filters to the whole canvas, the white bar might get filtered.
        // Ideally, filters apply to the VIDEO only.
        // Let's modify filter logic to apply to a temp canvas of the video?
        // Or apply filters to renderCanvas BUT clip?
        // Simpler: Apply filters to videoCanvas BEFORE drawing to renderCanvas?
        // BUT videoCanvas is persistent state. Modifying it breaks next frame.
        // So we must filter during transfer.
        
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
             // We need to filter the VIDEO part only.
             // Best way: Draw video to a temp canvas, filter THAT, then draw to renderCanvas.
             const fCanvas = document.createElement('canvas');
             fCanvas.width = originalWidth;
             fCanvas.height = originalHeight;
             const fCtx = fCanvas.getContext('2d');
             
             fCtx.filter = filterStr;
             fCtx.drawImage(videoCanvas, 0, 0);
             
             // Now draw the FILTERED video to renderCanvas
             // Overwrite the previous drawImage(videoCanvas)
             // Or just do it here instead of step 2.
             // We'll just overwrite/redraw the video part.
             renderCtx.drawImage(fCanvas, 0, videoOffsetY);
          }
        }

        // 3.5 Draw Drawings
        if (meme.drawings && meme.drawings.length > 0) {
            renderCtx.save();
            renderCtx.lineCap = 'round';
            renderCtx.lineJoin = 'round';
            
            meme.drawings.forEach(d => {
                if (!d.points || d.points.length < 2) return;
                renderCtx.beginPath();
                renderCtx.strokeStyle = d.color;
                renderCtx.lineWidth = d.width * (exportWidth / 800); 
                renderCtx.globalCompositeOperation = d.mode === 'eraser' ? 'destination-out' : 'source-over';
                
                renderCtx.moveTo(d.points[0].x * exportWidth, d.points[0].y * exportHeight);
                for (let i = 1; i < d.points.length; i++) {
                    renderCtx.lineTo(d.points[i].x * exportWidth, d.points[i].y * exportHeight);
                }
                renderCtx.stroke();
            });
            
            renderCtx.globalCompositeOperation = 'source-over';
            renderCtx.restore();
        }

        // 4. Draw Stickers
        for (const sticker of (stickers || [])) {
          const x = (sticker.x / 100) * exportWidth;
          const y = (sticker.y / 100) * exportHeight;
          const size = meme.stickerSize || 60;

          if (sticker.type === 'image') {
              const img = loadedImages[sticker.id];
              if (img) {
                  const aspect = img.height / img.width;
                  const drawWidth = size;
                  const drawHeight = size * aspect;
                  renderCtx.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
              }
          } else {
              renderCtx.font = `${size}px sans-serif`;
              renderCtx.textAlign = 'center';
              renderCtx.textBaseline = 'middle';
              renderCtx.fillText(sticker.url, x, y);
          }
        }

        // 5. Draw Texts
        for (const textItem of texts) {
          if (!textItem.content.trim()) continue;

          const x = (textItem.x / 100) * exportWidth;
          const y = (textItem.y / 100) * exportHeight;
          const fontSize = meme.fontSize || 40;
          const stroke = Math.max(1, fontSize / 25);
          const rotation = (textItem.rotation || 0) * (Math.PI / 180);
          const maxWidth = ((meme.maxWidth || 80) / 100) * exportWidth;
          const lineHeight = fontSize * 1.2;

          renderCtx.save();
          renderCtx.translate(x, y);
          renderCtx.rotate(rotation);
          
          if (renderCtx.letterSpacing !== undefined) {
              renderCtx.letterSpacing = `${meme.letterSpacing || 0}px`;
          }

          renderCtx.font = `bold ${fontSize}px ${meme.fontFamily || 'Impact'}, sans-serif`;
          renderCtx.textAlign = 'center';
          renderCtx.textBaseline = 'middle';
          
          // --- Text Wrapping Logic ---
          const lines = [];
          const rawLines = textItem.content.toUpperCase().split('\n');

          for (const rawLine of rawLines) {
              const words = rawLine.split(' ');
              let currentLine = words[0];

              for (let i = 1; i < words.length; i++) {
                  const word = words[i];
                  const width = renderCtx.measureText(currentLine + " " + word).width;
                  if (width < maxWidth) {
                      currentLine += " " + word;
                  } else {
                      lines.push(currentLine);
                      currentLine = word;
                  }
              }
              lines.push(currentLine);
          }

          // Calculate vertical offset to center the text block
          const totalHeight = lines.length * lineHeight;
          const startY = -(totalHeight / 2) + (lineHeight / 2);

          // Draw Text Background (if applicable)
          if (meme.textBgColor && meme.textBgColor !== 'transparent') {
             // Calculate bounding box for the whole block
             let maxLineWidth = 0;
             lines.forEach(line => {
                 const w = renderCtx.measureText(line).width;
                 if (w > maxLineWidth) maxLineWidth = w;
             });

             // Match CSS padding: 0.25em vertical, 0.5em horizontal
             const bgWidth = maxLineWidth + (fontSize * 1.0);
             const bgHeight = totalHeight + (fontSize * 0.5);
             
             renderCtx.fillStyle = meme.textBgColor;
             const radius = fontSize * 0.15;
             const bx = -bgWidth / 2;
             const by = -(totalHeight / 2) - (fontSize * 0.25); 
             
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

          // Draw Each Line
          renderCtx.shadowColor = 'rgba(0,0,0,0.8)';
          renderCtx.shadowBlur = 4;
          renderCtx.shadowOffsetY = 2;
          renderCtx.lineWidth = stroke * 2;
          renderCtx.lineJoin = 'round';
          renderCtx.strokeStyle = meme.textShadow || '#000000';
          renderCtx.fillStyle = meme.textColor || '#ffffff';

          lines.forEach((line, index) => {
              const lineY = startY + (index * lineHeight);
              
              // Stroke
              renderCtx.strokeText(line, 0, lineY);
              
              // Fill
              renderCtx.fillText(line, 0, lineY);
          });

          renderCtx.shadowColor = 'transparent';
          renderCtx.shadowBlur = 0;
          renderCtx.shadowOffsetY = 0;
          
          renderCtx.restore();
        }

        // --- DEEP FRY EFFECT (Frame by Frame) ---
        const deepFryLevel = meme.filters?.deepFry || 0;
        if (deepFryLevel > 0) {
            // 1. Pixel Destruction
            const imageData = renderCtx.getImageData(0, 0, exportWidth, exportHeight);
            const data = imageData.data;

            const contrastFactor = 1 + (deepFryLevel / 20); 
            const noiseAmount = deepFryLevel * 1.5;
            const satBoost = 1 + (deepFryLevel / 50);

            for (let p = 0; p < data.length; p += 4) {
                let r = data[p];
                let g = data[p + 1];
                let b = data[p + 2];

                // Noise (Random per frame = Animated Static!)
                const noise = (Math.random() - 0.5) * noiseAmount;
                r += noise;
                g += noise + (deepFryLevel * 0.2); // Yellow/Green tint
                b += noise;

                // Contrast
                r = (r - 128) * contrastFactor + 128;
                g = (g - 128) * contrastFactor + 128;
                b = (b - 128) * contrastFactor + 128;

                // Saturation
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                r = gray + (r - gray) * satBoost;
                g = gray + (g - gray) * satBoost;
                b = gray + (b - gray) * satBoost;

                // Clamp
                data[p] = Math.max(0, Math.min(255, r));
                data[p + 1] = Math.max(0, Math.min(255, g));
                data[p + 2] = Math.max(0, Math.min(255, b));
            }
            renderCtx.putImageData(imageData, 0, 0);

            // 2. JPEG Artifacts (The "Crunch")
            // We must go async here to load the degraded image
            const quality = Math.max(0.01, 0.9 - (deepFryLevel / 110)); 
            const jpegUrl = renderCanvas.toDataURL('image/jpeg', quality);
            
            await new Promise((resolveFrame) => {
                const crunchImg = new Image();
                crunchImg.onload = () => {
                    renderCtx.drawImage(crunchImg, 0, 0);
                    resolveFrame();
                };
                crunchImg.src = jpegUrl;
            });
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
