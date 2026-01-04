
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

    // 1. Pixel Destruction
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Scale factors
    const contrastFactor = 1 + (level / 20); 
    const noiseAmount = level * 1.5;
    const satBoost = 1 + (level / 50);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Noise
      const noise = (Math.random() - 0.5) * noiseAmount;
      r += noise;
      g += noise + (level * 0.2); // Yellow/Green tint
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
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    // 2. JPEG Nuke (Compression)
    // quality decreases as level increases
    const quality = Math.max(0.01, 0.9 - (level / 110)); 
    
    // convertToBlob is the OffscreenCanvas equivalent of toBlob/toDataURL
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality
    });

    self.postMessage({ success: true, blob });

  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
