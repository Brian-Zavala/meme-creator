// Deep Fry Worker - Runs image processing off the main thread
// Uses OffscreenCanvas for maximum performance

// Timeout wrapper for fetch to prevent infinite hangs
const fetchWithTimeout = (url, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    fetch(url, { signal: controller.signal })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
};

// Promise wrapper with timeout for any async operation
const withTimeout = (promise, timeoutMs, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

self.onmessage = async (e) => {
  const { imageSrc, level } = e.data;

  try {
    // 1. Fetch & Decode Image completely off-main-thread
    const response = await fetchWithTimeout(imageSrc, 10000);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const fetchBlob = await response.blob();

    if (fetchBlob.size === 0) throw new Error("Empty image blob received");

    // Wrap createImageBitmap with timeout (can hang on malformed images)
    const originalBitmap = await withTimeout(
      createImageBitmap(fetchBlob),
      5000,
      "Image decode timeout - image may be corrupted"
    );

    // 2. Resize Logic (Ported from imageProcessor.js)
    const MAX_SIZE = 1500;
    let width = originalBitmap.width;
    let height = originalBitmap.height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Draw resized
    ctx.drawImage(originalBitmap, 0, 0, width, height);
    originalBitmap.close(); // Cleanup original bitmap memory explicitly

    // ----------------------------------------------------
    // PIXEL DESTRUCTION (Exact port of your original logic)
    // ----------------------------------------------------
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Scale factors
    const contrastFactor = 1 + (level / 15);
    const noiseAmount = level * 2.5;
    const satBoost = 1 + (level / 20);
    const doSharpen = level > 10;

    // Create copy for sharpening only if needed (saves memory)
    const copy = doSharpen ? new Uint8ClampedArray(data) : null;

    // Process all pixels (Sync is fine here because we are in a worker!)
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // --- Sharpening ---
      if (doSharpen) {
        const p = i / 4;
        const x = p % width;
        const y = Math.floor(p / width);

        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          // Simple kernel convolution
          const top = i - (width * 4);
          const bottom = i + (width * 4);
          const left = i - 4;
          const right = i + 4;

          let sr = copy[i] * 5;
          let sg = copy[i + 1] * 5;
          let sb = copy[i + 2] * 5;

          sr -= (copy[top] + copy[bottom] + copy[left] + copy[right]);
          sg -= (copy[top + 1] + copy[bottom + 1] + copy[left + 1] + copy[right + 1]);
          sb -= (copy[top + 2] + copy[bottom + 2] + copy[left + 2] + copy[right + 2]);

          r = sr; g = sg; b = sb;
        }
      }

      // --- Noise Injection ---
      const noise = (Math.random() - 0.5) * noiseAmount;
      r += noise; g += noise; b += noise;

      // Deep Fry Color Artifacts
      if (r > 240 && g > 240 && b > 240) {
        const dirty = (Math.random() - 0.5) * (level * 1.5);
        r += dirty; g += dirty; b += dirty;
      }
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
      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    ctx.putImageData(imageData, 0, 0);

    // ----------------------------------------------------
    // JPEG NUKE LOOP (Generation Loss)
    // ----------------------------------------------------
    const quality = Math.max(0.01, 0.8 - (level / 120));
    const loops = level > 50 ? 3 : level > 20 ? 2 : 1;

    let blob;
    for (let i = 0; i < loops; i++) {
      // Wrap convertToBlob with timeout (can hang on memory issues)
      blob = await withTimeout(
        canvas.convertToBlob({ type: "image/jpeg", quality }),
        5000,
        "Blob conversion timeout"
      );
      if (i < loops - 1) {
        const bmp = await withTimeout(
          createImageBitmap(blob),
          3000,
          "Image re-decode timeout"
        );
        ctx.drawImage(bmp, 0, 0);
      }
    }

    self.postMessage({ success: true, blob });

  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
