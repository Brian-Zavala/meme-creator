/**
 * Auto Layout Service
 *
 * Computes "intelligent" text positions by analyzing image content.
 * Combines multiple heuristics into a composite score per zone:
 *
 *   1. Luminance contrast  — prefer zones where text color stands out
 *   2. Uniformity           — prefer smooth/flat zones over busy textures
 *   3. Edge density         — avoid zones with lots of edges (objects, faces)
 *   4. Subject avoidance    — prefer zones away from the image's visual center of mass
 *
 * No external API — pure Canvas 2D heuristics.
 */

const GRID_SIZE = 80;       // px — canvas size for analysis (larger = more accurate)
const SAMPLE_ROWS = 3;      // top / mid / bottom
const SAMPLE_COLS = 3;      // left / center / right
const IMAGE_LOAD_TIMEOUT = 4000; // ms

// Scoring weights — tuned for meme readability
const W_CONTRAST    = 0.40; // Luminance contrast against text color
const W_UNIFORMITY  = 0.30; // Prefer flat/solid zones (low variance)
const W_EDGE        = 0.15; // Penalize zones with many edges
const W_SUBJECT     = 0.15; // Prefer zones away from the visual center of mass


// ────────────────────────────────────────────────────────────────
// Pixel-level helpers
// ────────────────────────────────────────────────────────────────

/**
 * Convert RGBA pixel at index i to grayscale luminance (0–255).
 */
function pixelLuminance(data, i) {
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

/**
 * Compute average luminance for a rectangular region.
 */
function regionAvgLuminance(data, imgW, x0, y0, w, h) {
  let total = 0;
  let count = 0;
  const maxX = Math.min(x0 + w, imgW);
  const maxY = Math.min(y0 + h, GRID_SIZE);

  for (let y = y0; y < maxY; y++) {
    for (let x = x0; x < maxX; x++) {
      const i = (y * imgW + x) * 4;
      if (data[i + 3] < 128) continue; // skip transparent
      total += pixelLuminance(data, i);
      count++;
    }
  }
  return count > 0 ? total / count : 128;
}

/**
 * Compute luminance variance (standard deviation) for a region.
 * High variance = busy texture, low variance = smooth/uniform.
 * Returns 0–1 (normalized).
 */
function regionVariance(data, imgW, x0, y0, w, h, avgLum) {
  let sumSqDiff = 0;
  let count = 0;
  const maxX = Math.min(x0 + w, imgW);
  const maxY = Math.min(y0 + h, GRID_SIZE);

  for (let y = y0; y < maxY; y++) {
    for (let x = x0; x < maxX; x++) {
      const i = (y * imgW + x) * 4;
      if (data[i + 3] < 128) continue;
      const diff = pixelLuminance(data, i) - avgLum;
      sumSqDiff += diff * diff;
      count++;
    }
  }

  if (count < 2) return 0;
  const stdDev = Math.sqrt(sumSqDiff / count);
  // Normalize: stdDev of 0 => 0 (perfect uniformity), stdDev of ~80+ => 1 (very noisy)
  return Math.min(stdDev / 80, 1);
}

/**
 * Compute edge density using a simplified Sobel-like horizontal+vertical
 * gradient magnitude. Returns 0–1 (higher = more edges).
 */
function regionEdgeDensity(data, imgW, x0, y0, w, h) {
  let edgeSum = 0;
  let count = 0;
  const maxX = Math.min(x0 + w - 1, imgW - 1);
  const maxY = Math.min(y0 + h - 1, GRID_SIZE - 1);

  for (let y = y0 + 1; y < maxY; y++) {
    for (let x = x0 + 1; x < maxX; x++) {
      const i = (y * imgW + x) * 4;
      // Horizontal gradient
      const left = pixelLuminance(data, ((y) * imgW + (x - 1)) * 4);
      const right = pixelLuminance(data, ((y) * imgW + (x + 1)) * 4);
      const gx = right - left;
      // Vertical gradient
      const top = pixelLuminance(data, ((y - 1) * imgW + x) * 4);
      const bottom = pixelLuminance(data, ((y + 1) * imgW + x) * 4);
      const gy = bottom - top;
      // Gradient magnitude
      edgeSum += Math.sqrt(gx * gx + gy * gy);
      count++;
    }
  }

  if (count === 0) return 0;
  const avgEdge = edgeSum / count;
  // Normalize: avgEdge of ~50+ is very edgy
  return Math.min(avgEdge / 50, 1);
}

/**
 * Compute the visual "center of mass" of the image based on luminance.
 * Bright pixels = heavier. Returns { cx, cy } in 0–1 range.
 * The main subject tends to cluster near this point.
 */
function visualCenterOfMass(data, imgW, imgH) {
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;

  // Sample every 2nd pixel for speed
  for (let y = 0; y < imgH; y += 2) {
    for (let x = 0; x < imgW; x += 2) {
      const i = (y * imgW + x) * 4;
      if (data[i + 3] < 128) continue;
      // Use inverse luminance as weight: dark objects (subjects) pull heavier
      // Most photos: subject is darker than sky/background
      const lum = pixelLuminance(data, i);
      // Weight dark pixels MORE (subjects tend to be darker than backgrounds)
      // Weight bright pixels less, but still non-zero
      const weight = 255 - lum + 30; // +30 baseline so even bright areas have some pull

      totalWeight += weight;
      sumX += x * weight;
      sumY += y * weight;
    }
  }

  if (totalWeight === 0) return { cx: 0.5, cy: 0.5 };
  return {
    cx: (sumX / totalWeight) / imgW,
    cy: (sumY / totalWeight) / imgH,
  };
}


// ────────────────────────────────────────────────────────────────
// Image loading
// ────────────────────────────────────────────────────────────────

/**
 * Load image URL to pixel data. Handles blob:, data:, and http(s) URLs.
 */
function loadImagePixels(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error("Image load timed out"));
    }, IMAGE_LOAD_TIMEOUT);

    // Only set crossOrigin for remote URLs
    if (imageUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = GRID_SIZE;
        canvas.height = GRID_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
        const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
        resolve({ data: imageData.data, width: GRID_SIZE, height: GRID_SIZE });
      } catch (e) {
        reject(new Error(`Canvas tainted: ${e.message}`));
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Failed to load image for layout analysis"));
    };

    img.src = imageUrl;
  });
}


// ────────────────────────────────────────────────────────────────
// Scoring & layout
// ────────────────────────────────────────────────────────────────

/**
 * WCAG-inspired contrast score between zone luminance and text luminance.
 * Returns 0–1 (higher = better).
 */
function contrastScore(zoneLum, textLum) {
  const zL = zoneLum / 255;
  const tL = textLum / 255;
  const lighter = Math.max(zL, tL) + 0.05;
  const darker = Math.min(zL, tL) + 0.05;
  const ratio = lighter / darker;
  return Math.min((ratio - 1) / 10, 1);
}

/**
 * Distance penalty from the visual center of mass.
 * Returns 0–1 (higher = farther from subject = better for text).
 */
function subjectDistance(zoneRow, zoneCol, com) {
  // Map zone position to 0–1 space
  const zx = (zoneCol + 0.5) / SAMPLE_COLS;
  const zy = (zoneRow + 0.5) / SAMPLE_ROWS;
  const dist = Math.sqrt((zx - com.cx) ** 2 + (zy - com.cy) ** 2);
  // Normalize: max possible distance in a unit square is sqrt(2) ≈ 1.414
  return Math.min(dist / 0.707, 1); // 0.707 = half diagonal
}

/**
 * Parse hex color to Rec.709 luminance (0–255).
 */
function hexToLuminance(hex) {
  if (!hex || typeof hex !== "string") return 255;
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) return 255;
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Position maps (rule-of-thirds inspired, meme-optimized)
// These are CENTERS — text extends outward from these points.
// With translate(-50%, -50%) centering + overflow:hidden on the canvas,
// positions too close to edges get clipped. Use safe margins.
const ROW_Y = [15, 50, 85]; // top, center, bottom (%)
const COL_X = [35, 50, 65]; // left, center, right (%)

// Hard limits: text center must stay within this safe zone
const MIN_X = 10;
const MAX_X = 90;
const MIN_Y = 8;
const MAX_Y = 92;

/**
 * Clamp a position to ensure text stays within canvas bounds.
 * Text uses CSS translate(-50%, -50%) so the center must be
 * far enough from edges for the text to remain visible.
 */
function clampPosition(pos) {
  return {
    x: Math.max(MIN_X, Math.min(MAX_X, Math.round(pos.x))),
    y: Math.max(MIN_Y, Math.min(MAX_Y, Math.round(pos.y))),
  };
}


/**
 * Classic meme fallback positions.
 */
function defaultPositions(count) {
  if (count === 1) return [clampPosition({ x: 50, y: 15 })];
  if (count === 2) return [clampPosition({ x: 50, y: 15 }), clampPosition({ x: 50, y: 85 })];
  if (count === 3) return [clampPosition({ x: 50, y: 15 }), clampPosition({ x: 50, y: 50 }), clampPosition({ x: 50, y: 85 })];
  return Array.from({ length: count }, (_, i) => clampPosition({
    x: 50,
    y: Math.round(12 + (i / (count - 1)) * 76),
  }));
}


// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────

/**
 * Compute optimal { x, y } positions for text elements.
 *
 * Combines four heuristics into a composite score per 3x3 zone:
 *   - Contrast (40%): luminance diff vs. user's text color
 *   - Uniformity (30%): low pixel variance = clean backgrounds
 *   - Edge avoidance (15%): fewer edges = less visual noise
 *   - Subject avoidance (15%): distance from visual center of mass
 *
 * @param {string} imageUrl - blob:, data:, or http URL
 * @param {number} textCount - how many texts to position
 * @param {string} textColor - user's hex text color (for contrast scoring)
 * @returns {Promise<Array<{x: number, y: number}>>}
 */
export async function computeAutoLayout(imageUrl, textCount = 2, textColor = "#ffffff") {
  const count = Math.max(1, Math.min(textCount, 9));

  let pixels;
  try {
    pixels = await loadImagePixels(imageUrl);
  } catch {
    return defaultPositions(count);
  }

  const { data, width, height } = pixels;
  const textLum = hexToLuminance(textColor);
  const com = visualCenterOfMass(data, width, height);

  const cellW = Math.floor(width / SAMPLE_COLS);
  const cellH = Math.floor(height / SAMPLE_ROWS);

  // Analyze each zone
  const zones = [];
  for (let r = 0; r < SAMPLE_ROWS; r++) {
    for (let c = 0; c < SAMPLE_COLS; c++) {
      const x0 = c * cellW;
      const y0 = r * cellH;

      const avgLum = regionAvgLuminance(data, width, x0, y0, cellW, cellH);
      const variance = regionVariance(data, width, x0, y0, cellW, cellH, avgLum);
      const edgeDensity = regionEdgeDensity(data, width, x0, y0, cellW, cellH);
      const subjDist = subjectDistance(r, c, com);

      // Composite score: higher = better for text placement
      const score =
        W_CONTRAST   * contrastScore(avgLum, textLum) +
        W_UNIFORMITY * (1 - variance) +    // Invert: low variance = high score
        W_EDGE       * (1 - edgeDensity) + // Invert: low edges = high score
        W_SUBJECT    * subjDist;            // Far from subject = high score

      zones.push({ row: r, col: c, score, x: COL_X[c], y: ROW_Y[r] });
    }
  }

  // Sort by composite score descending
  zones.sort((a, b) => b.score - a.score);

  // ── 1 TEXT ───────────────────────────
  if (count === 1) {
    return [clampPosition({ x: zones[0].x, y: zones[0].y })];
  }

  // ── 2 TEXTS (classic meme: top + bottom) ────────
  if (count === 2) {
    const topZones = zones.filter(z => z.row === 0);
    const bottomZones = zones.filter(z => z.row === 2);
    const midZones = zones.filter(z => z.row === 1);

    let pick1 = topZones[0] || midZones[0] || zones[0];
    let pick2 = bottomZones[0] || midZones.find(z => z !== pick1) || zones[zones.length - 1];

    // If both candidates score terribly, check if mid-row is significantly better
    if (pick1.score < 0.2 && pick2.score < 0.2 && midZones.length > 0) {
      const bestMid = midZones[0];
      if (bestMid.score > pick1.score * 1.5) {
        pick1 = bestMid;
        pick2 = zones.find(z => z.row !== pick1.row && z !== pick1) || pick2;
      }
    }

    // Ensure vertical order (top first)
    if (pick1.y > pick2.y) [pick1, pick2] = [pick2, pick1];
    return [clampPosition({ x: pick1.x, y: pick1.y }), clampPosition({ x: pick2.x, y: pick2.y })];
  }

  // ── 3+ TEXTS ───────────────────────────
  const result = [];
  const usedRows = new Set();
  const usedKeys = new Set();

  // Pass 1: one zone per unique row (best composite score)
  for (const zone of zones) {
    if (result.length >= count) break;
    if (!usedRows.has(zone.row)) {
      usedRows.add(zone.row);
      usedKeys.add(`${zone.row}-${zone.col}`);
      result.push({ x: zone.x, y: zone.y });
    }
  }

  // Pass 2: fill remaining with best unused zones
  for (const zone of zones) {
    if (result.length >= count) break;
    const key = `${zone.row}-${zone.col}`;
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      result.push({ x: zone.x, y: zone.y });
    }
  }

  // Pass 3: fallback padding
  while (result.length < count) {
    const defs = defaultPositions(count);
    result.push(defs[result.length] || { x: 50, y: 50 });
  }

  // Sort by Y for natural reading order (top to bottom)
  result.sort((a, b) => a.y - b.y);

  return result.slice(0, count).map(clampPosition);
}
