self.onmessage = async (e) => {
  const { imageBitmap, level } = e.data;

  try {
    if (!imageBitmap) throw new Error("No image data");

    const width = imageBitmap.width;
    const height = imageBitmap.height;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw the image onto the offscreen canvas
    ctx.drawImage(imageBitmap, 0, 0);

    // 1. Pixel Destruction (Noise & Sharpening)
    let imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;

    // Scale factors
    const contrastFactor = 1 + (level / 15); // Increased from /20
    const noiseAmount = level * 2.5;        // Increased from *1.5
    const satBoost = 1 + (level / 20);      // Increased from /50

    // Standard Sharpen Kernel
    //  0 -1  0
    // -1  5 -1
    //  0 -1  0
    const sharpenKernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const doSharpen = level > 10;
    const copy = doSharpen ? new Uint8ClampedArray(data) : null;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // --- Sharpening ---
      if (doSharpen) {
        // Simplified convolution for center pixels (skip edges for speed)
        const pIdx = i / 4;
        const x = pIdx % width;
        const y = Math.floor(pIdx / width);
        
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
             let sr = 0, sg = 0, sb = 0;
             // Apply 3x3 kernel
             // (-1, -1) is i - width*4 - 4
             // Center is i
             
             // Top
             const top = i - (width * 4);
             sr += copy[top] * -1;
             sg += copy[top+1] * -1;
             sb += copy[top+2] * -1;
             
             // Bottom
             const bottom = i + (width * 4);
             sr += copy[bottom] * -1;
             sg += copy[bottom+1] * -1;
             sb += copy[bottom+2] * -1;
             
             // Left
             const left = i - 4;
             sr += copy[left] * -1;
             sg += copy[left+1] * -1;
             sb += copy[left+2] * -1;

             // Right
             const right = i + 4;
             sr += copy[right] * -1;
             sg += copy[right+1] * -1;
             sb += copy[right+2] * -1;
             
             // Center
             sr += copy[i] * 5;
             sg += copy[i+1] * 5;
             sb += copy[i+2] * 5;
             
             r = sr;
             g = sg;
             b = sb;
        }
      }

      // --- Noise Injection ---
      const noise = (Math.random() - 0.5) * noiseAmount;
      r += noise;
      g += noise;
      b += noise;

      // "White Background Hack": Inject noise into pure whites
      if (r > 240 && g > 240 && b > 240) {
          const dirty = (Math.random() - 0.5) * (level * 1.5);
          r += dirty;
          g += dirty;
          b += dirty;
      }
      
      // "Dark Background Hack": Green static
      if (r < 50 && g < 50 && b < 50) {
          g += (Math.random() * (level * 0.8));
      }

      // --- Color Grading ---
      
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
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    // 2. JPEG Nuke (Generation Loss Loop)
    // "Export to JPEG (Quality 0.1) -> Draw back -> Repeat 3 times"
    
    // Quality scales: Level 1 (0.8) -> Level 100 (0.01)
    const quality = Math.max(0.01, 0.8 - (level / 120)); 
    const loops = level > 50 ? 3 : level > 20 ? 2 : 1;
    
    let blob;
    for (let i = 0; i < loops; i++) {
        blob = await canvas.convertToBlob({
            type: "image/jpeg",
            quality: quality
        });
        
        // If we have more loops, draw it back
        if (i < loops - 1) {
            const bmp = await createImageBitmap(blob);
            ctx.drawImage(bmp, 0, 0);
        }
    }

    self.postMessage({ success: true, blob });

  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};