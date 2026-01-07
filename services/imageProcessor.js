/**
 * Deep Frys an image on the Main Thread.
 * Ports the exact logic from the old Worker (Sharpen, Noise, JPEG Nuke)
 * but runs safely on the main thread to avoid crashes/CORS issues.
 */
export async function deepFryImage(imageSrc, level, signal = null) {
  if (!level || level <= 0) return null;

  return new Promise((resolve, reject) => {
    const img = new Image();

    // 1. SMART LOADING (Prevents CORS/URL Crashes)
    const isBase64 = imageSrc.startsWith('data:');
    const isBlob = imageSrc.startsWith('blob:');

    if (isBase64 || isBlob) {
      img.src = imageSrc;
    } else {
      img.crossOrigin = "Anonymous";
      // Force fresh request to bypass read-only cache
      const cacheBuster = imageSrc.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = imageSrc + cacheBuster;
    }

    img.onload = async () => {
      if (signal?.aborted) return reject(new Error("Aborted"));

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        // 2. RESIZE (Prevent Mobile Memory Crash)
        const MAX_SIZE = 1500;
        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // ----------------------------------------------------
        // 3. PIXEL DESTRUCTION (Ported from Worker)
        // ----------------------------------------------------
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Scale factors
        const contrastFactor = 1 + (level / 15);
        const noiseAmount = level * 2.5;
        const satBoost = 1 + (level / 20);

        // Sharpen Logic
        const doSharpen = level > 10;
        const copy = doSharpen ? new Uint8ClampedArray(data) : null;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // --- Sharpening ---
          if (doSharpen) {
            const pIdx = i / 4;
            const x = pIdx % width;
            const y = Math.floor(pIdx / width);

            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
              let sr = 0, sg = 0, sb = 0;

              // Top
              const top = i - (width * 4);
              sr += copy[top] * -1; sg += copy[top + 1] * -1; sb += copy[top + 2] * -1;
              // Bottom
              const bottom = i + (width * 4);
              sr += copy[bottom] * -1; sg += copy[bottom + 1] * -1; sb += copy[bottom + 2] * -1;
              // Left
              const left = i - 4;
              sr += copy[left] * -1; sg += copy[left + 1] * -1; sb += copy[left + 2] * -1;
              // Right
              const right = i + 4;
              sr += copy[right] * -1; sg += copy[right + 1] * -1; sb += copy[right + 2] * -1;
              // Center
              sr += copy[i] * 5; sg += copy[i + 1] * 5; sb += copy[i + 2] * 5;

              r = sr; g = sg; b = sb;
            }
          }

          // --- Noise Injection ---
          const noise = (Math.random() - 0.5) * noiseAmount;
          r += noise; g += noise; b += noise;

          // White Background Hack
          if (r > 240 && g > 240 && b > 240) {
            const dirty = (Math.random() - 0.5) * (level * 1.5);
            r += dirty; g += dirty; b += dirty;
          }
          // Dark Background Hack
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
        // 4. JPEG NUKE LOOP (The "Generation Loss" Effect)
        // ----------------------------------------------------
        const quality = Math.max(0.01, 0.8 - (level / 120));
        const loops = level > 50 ? 3 : level > 20 ? 2 : 1;

        let finalBlob = null;

        for (let i = 0; i < loops; i++) {
          finalBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));

          if (signal?.aborted) return reject(new Error("Aborted"));

          if (i < loops - 1) {
            const bmp = await createImageBitmap(finalBlob);
            ctx.drawImage(bmp, 0, 0);
          }
        }

        if (finalBlob) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(finalBlob);
        } else {
          resolve(null);
        }

      } catch (err) {
        console.error("Deep Fry Error:", err);
        reject(err);
      }
    };

    img.onerror = () => {
      console.warn("Deep Fry Skipped: CORS/Network error.");
      resolve(null);
    };
  });
}