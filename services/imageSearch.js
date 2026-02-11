/**
 * Unified Image Search Service
 *
 * Providers:
 *   - Unsplash: Direct client-side (client_id query param, no proxy needed)
 *   - Pexels:   Lean Netlify function proxy (Authorization header hidden server-side)
 *   - Imgflip:  Local filtering only (no network calls from here)
 *
 * All providers return a normalized result shape for the UI.
 */

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// ─── LRU Cache (max 20 entries per provider) ──────────────────────────
class LRUCache {
  constructor(max = 20) {
    this._max = max;
    this._map = new Map();
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const val = this._map.get(key);
    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, val);
    return val;
  }

  set(key, val) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, val);
    // Evict oldest if over capacity
    if (this._map.size > this._max) {
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }
  }

  clear() {
    this._map.clear();
  }
}

const unsplashCache = new LRUCache(20);
const pexelsCache = new LRUCache(20);

// ─── Name Sanitizer ───────────────────────────────────────────────────
/**
 * Convert raw API text (alt_description, etc.) into a clean image title.
 * Used for display in dropdown AND as the download filename via meme.name.
 * Example: "a brown dog sitting on a beach at sunset" → "A Brown Dog Sitting On A Beach At Sunset"
 */
function toImageName(raw, fallback = "Photo") {
  if (!raw || typeof raw !== "string") return fallback;
  return raw
    .replace(/[^a-zA-Z0-9\s-]/g, "")  // Strip special chars
    .replace(/\s+/g, " ")              // Collapse whitespace
    .trim()
    .slice(0, 60)                       // Cap at 60 chars for sane filenames
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    || fallback;
}

// ─── Normalized Result Shape ──────────────────────────────────────────
/**
 * @typedef {Object} ImageResult
 * @property {string} id
 * @property {string} name        - Clean, title-cased image name for display + download
 * @property {string} url         - Full-size URL for loading onto canvas
 * @property {string} thumbUrl    - Thumbnail for dropdown grid
 * @property {number} width
 * @property {number} height
 * @property {string} photographer
 * @property {string} photographerUrl
 * @property {string} source      - "unsplash" | "pexels"
 * @property {string} [downloadLocation] - Unsplash download tracking endpoint
 */

// ─── Unsplash Adapter (Client-Side Direct) ────────────────────────────
function mapUnsplashResult(photo) {
  // Prefer alt_description (most descriptive), then description, then slug
  const rawName = photo.alt_description || photo.description || photo.slug?.replace(/-/g, " ");
  return {
    id: photo.id,
    name: toImageName(rawName, "Unsplash Photo"),
    url: photo.urls.regular,       // 1080px wide, optimized
    thumbUrl: photo.urls.small,    // 400px wide, CDN-optimized
    width: photo.width,
    height: photo.height,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html + "?utm_source=meme_creator&utm_medium=referral",
    source: "unsplash",
    downloadLocation: photo.links.download_location,
    // Keep color for placeholder
    blurHash: photo.blur_hash,
    color: photo.color,
  };
}

/**
 * Search Unsplash directly from the browser (no proxy).
 * @param {string} query
 * @param {number} page
 * @param {number} perPage
 * @param {AbortSignal} [signal]
 * @returns {Promise<{results: ImageResult[], totalPages: number}>}
 */
export async function searchUnsplash(query, page = 1, perPage = 30, signal) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("Missing VITE_UNSPLASH_ACCESS_KEY");
    return { results: [], totalPages: 0 };
  }

  // If query is empty, fetch editorial feed (popular)
  const isEditorial = !query?.trim();
  const endpoint = isEditorial ? "https://api.unsplash.com/photos" : "https://api.unsplash.com/search/photos";

  const cacheKey = `${query || "POPULAR"}-${page}-${perPage}`;
  const cached = unsplashCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    client_id: UNSPLASH_ACCESS_KEY,
  });

  if (!isEditorial) {
    params.append("query", query.trim());
    params.append("content_filter", "high");
  } else {
    params.append("order_by", "popular");
  }

  try {
    const res = await fetch(
      `${endpoint}?${params}`,
      { signal }
    );

    if (!res.ok) {
      if (res.status === 403) console.error("Unsplash rate limit exceeded");
      throw new Error(`Unsplash ${res.status}`);
    }

    const data = await res.json();
    const result = {
      results: (data.results || []).map(mapUnsplashResult),
      totalPages: data.total_pages || 0,
    };

    unsplashCache.set(cacheKey, result);
    return result;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    console.error("Unsplash search error:", err);
    return { results: [], totalPages: 0 };
  }
}

/**
 * Get a single random image from Unsplash.
 * @returns {Promise<ImageResult|null>}
 */
export async function getRandomUnsplashImage() {
  if (!UNSPLASH_ACCESS_KEY) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?content_filter=high&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    if (!res.ok) throw new Error(`Unsplash random ${res.status}`);
    const data = await res.json();
    return mapUnsplashResult(data);
  } catch (err) {
    console.error("Unsplash random error:", err);
    return null;
  }
}

/**
 * Track a download event for Unsplash API compliance.
 * Unsplash requires triggering this when a photo is used.
 * Fire-and-forget, non-blocking.
 * @param {ImageResult} photo
 */
export function trackUnsplashDownload(photo) {
  if (!photo?.downloadLocation || !UNSPLASH_ACCESS_KEY) return;

  try {
    const url = new URL(photo.downloadLocation);
    url.searchParams.set("client_id", UNSPLASH_ACCESS_KEY);

    // Unsplash requires GET for download tracking.
    // sendBeacon uses POST, so we use fetch with keepalive instead.
    fetch(url.toString(), {
      method: "GET",
      keepalive: true
    }).catch(err => console.error("Unsplash track error:", err));
  } catch (err) {
    console.error("Invalid download location:", photo.downloadLocation);
  }
}

// ─── Pexels Adapter (Via Netlify Proxy) ───────────────────────────────
function mapPexelsResult(photo) {
  return {
    id: String(photo.id),
    name: toImageName(photo.alt, "Pexels Photo"),
    url: photo.src_large2x || photo.src_original,   // Full size
    thumbUrl: photo.src_medium,                       // ~350px thumb
    width: photo.width,
    height: photo.height,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url + "?utm_source=meme_creator&utm_medium=referral",
    source: "pexels",
    // Keep color for placeholder
    color: photo.avg_color,
  };
}

/**
 * Search Pexels via our lean Netlify proxy.
 * @param {string} query
 * @param {number} page
 * @param {number} perPage
 * @param {AbortSignal} [signal]
 * @returns {Promise<{results: ImageResult[], totalPages: number}>}
 */
export async function searchPexels(query, page = 1, perPage = 30, signal) {
  // If query is empty, use curated endpoint
  const isCurated = !query?.trim();
  const cacheKey = `${query || "CURATED"}-${page}-${perPage}`;

  const cached = pexelsCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (isCurated) {
    params.append("endpoint", "curated");
  } else {
    params.append("query", query.trim());
    params.append("endpoint", "search");
  }

  try {
    const res = await fetch(
      `/.netlify/functions/pexels?${params}`,
      { signal }
    );

    if (!res.ok) throw new Error(`Pexels proxy ${res.status}`);

    const data = await res.json();
    const result = {
      results: (data.photos || []).map(mapPexelsResult),
      totalPages: Math.ceil((data.total_results || 0) / perPage),
    };

    pexelsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    console.error("Pexels search error:", err);
    return { results: [], totalPages: 0 };
  }
}

/**
 * Get a single random (curated) image from Pexels.
 * Simulates randomness by picking a random page from curated list.
 * @returns {Promise<ImageResult|null>}
 */
export async function getRandomPexelsImage() {
  // Random page 1-100
  const page = Math.floor(Math.random() * 100) + 1;
  const params = new URLSearchParams({
    endpoint: "curated",
    page: String(page),
    per_page: "1",
  });

  try {
    const res = await fetch(`/.netlify/functions/pexels?${params}`);
    if (!res.ok) throw new Error(`Pexels random ${res.status}`);
    const data = await res.json();
    const photo = data.photos?.[0];
    return photo ? mapPexelsResult(photo) : null;
  } catch (err) {
    console.error("Pexels random error:", err);
    return null;
  }
}

/**
 * Search Pexels Videos
 */
export async function searchPexelsVideos(query, page = 1) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    per_page: "20",
    ...(query ? { endpoint: "search" } : { endpoint: "curated" }), // Use curated (popular) if no query
    type: "video",
  });

  try {
    const res = await fetch(`/.netlify/functions/pexels?${params}`);
    if (!res.ok) throw new Error(`Pexels video search ${res.status}`);
    const data = await res.json();
    return {
      results: (data.videos || []).map(mapPexelsVideo),
      totalPages: Math.ceil((data.total_results || 0) / 20),
    };
  } catch (err) {
    if (err.name === "AbortError") throw err;
    console.error("Pexels video search error:", err);
    return { results: [], totalPages: 0 };
  }
}

/**
 * Get random Pexels Video (from popular)
 */
export async function getRandomPexelsVideo() {
  const page = Math.floor(Math.random() * 50) + 1; // Popular videos
  const params = new URLSearchParams({
    endpoint: "curated", // maps to /videos/popular
    type: "video",
    page: String(page),
    per_page: "1",
  });

  try {
    const res = await fetch(`/.netlify/functions/pexels?${params}`);
    if (!res.ok) throw new Error(`Pexels random video ${res.status}`);
    const data = await res.json();
    const video = data.videos?.[0];
    return video ? mapPexelsVideo(video) : null;
  } catch (err) {
    console.error("Pexels random video error:", err);
    return null;
  }
}

function mapPexelsVideo(video) {
  // Find best quality MP4 (Prefer 1080p/HD, then 720p, then SD)
  const files = video.video_files || [];
  const bestFile = files.find(f => f.quality === "hd" && f.width <= 1920 && f.width >= 1080) || // Prefer 1080p
                   files.find(f => f.quality === "hd" && f.width <= 1280) || // Fallback to 720p
                   files.find(f => f.quality === "sd") ||
                   files[0];

  return {
    id: String(video.id),
    name: toImageName("Pexels Video", "Video"),
    url: bestFile?.link,
    thumbUrl: video.image, // Pexels provides a poster image
    width: bestFile?.width || video.width,
    height: bestFile?.height || video.height,
    photographer: video.user.name,
    photographerUrl: video.user.url + "?utm_source=meme_creator&utm_medium=referral",
    source: "pexels_video",
    isVideo: true,
    duration: video.duration
  };
}

// ─── Unified Search Dispatcher ────────────────────────────────────────
/**
 * Search images from the specified source.
 * @param {"unsplash"|"pexels"} source
 * @param {string} query
 * @param {number} page
 * @param {AbortSignal} [signal]
 * @returns {Promise<{results: ImageResult[], totalPages: number}>}
 */
export async function searchImages(source, query, page = 1, signal) {
  switch (source) {
    case "unsplash":
      return searchUnsplash(query, page, 30, signal);
    case "pexels":
      return searchPexels(query, page, 30, signal);
    default:
      return { results: [], totalPages: 0 };
  }
}

/**
 * Get a random image from the specified source.
 * @param {"unsplash"|"pexels"} source
 * @returns {Promise<ImageResult|null>}
 */
export async function getRandomImage(source) {
  switch (source) {
    case "unsplash":
      return getRandomUnsplashImage();
    case "pexels":
      return getRandomPexelsImage();
    default:
      return null;
  }
}
