const API_KEY = import.meta.env.VITE_GIPHY_KEY;

/**
 * Maps GIPHY API Object to our App's Internal Format
 */
function mapGiphyResult(item) {
  return {
    id: item.id,
    name: item.title || "Giphy GIF",
    url: item.images.original.url, // Full quality
    shareUrl: item.images.fixed_height.url, // Preview / Share quality
    width: parseInt(item.images.original.width, 10),
    height: parseInt(item.images.original.height, 10),
    isSticker: !!item.import_datetime, // Rough check, or we pass context
  };
}

/**
 * Search GIPHY for GIFs or Stickers
 * @param {string} query - Search term
 * @param {string} type - 'gif' or 'sticker'
 * @returns {Promise<Array>}
 */
export async function searchGiphy(query, type = 'gif') {
  if (!API_KEY) {
    console.error("GIPHY API Key Missing! Set VITE_GIPHY_KEY in .env");
    return [];
  }

  const isSticker = type === 'sticker';
  const resourceType = isSticker ? 'stickers' : 'gifs';
  const endpoint = query ? 'search' : 'trending';

  // Base URL
  let url = `https://api.giphy.com/v1/${resourceType}/${endpoint}?api_key=${API_KEY}&limit=50&rating=g`;

  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.meta && data.meta.status !== 200) {
      console.error("GIPHY API Error:", data.meta.msg);
      return [];
    }

    return (data.data || []).map(mapGiphyResult);
  } catch (error) {
    console.error("GIPHY Network Error:", error);
    return [];
  }
}

/**
 * Register a share/view with GIPHY (Compliance)
 * @param {string} id - Giphy ID
 */
export async function registerShare(id) {
  // GIPHY doesn't technically require a "register share" call like Tenor
  // for simple API usage, but we can implement analytics here if needed.
  // Usually, simply loading the image from their CDN counts.
  // However, checking documentation, they have a 'pingback' requirement for SDKs.
  // For standard API, this is often treated as a no-op or handled via tracking pixels.
  // We'll leave it as a placeholder or log it for now.
  // See: https://developers.giphy.com/docs/api/schema#response-object
}

/**
 * Get Autocomplete suggestions
 * @param {string} query
 */
export async function getAutocomplete(query) {
  if (!query || query.length < 2) return [];
  if (!API_KEY) return [];

  const url = `https://api.giphy.com/v1/gifs/search/tags?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=5`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.data || []).map(item => item.name);
  } catch (e) {
    return [];
  }
}

/**
 * Get Categories (Tags)
 * NOTE: GIPHY categories endpoint structure is different.
 * We often just fetch 'categories' or 'trending' tags.
 */
export async function getCategories() {
  if (!API_KEY) return [];
  const url = `https://api.giphy.com/v1/gifs/categories?api_key=${API_KEY}`; // Standard categories
  try {
    const res = await fetch(url);
    const data = await res.json();
    // Giphy categories are nested. data.data = [{ name, name_encoded, subcategories, gif }]
    return (data.data || []).map(cat => ({
      name: cat.name,
      searchterm: cat.name,
      image: cat.gif?.images?.fixed_height?.url || cat.gif?.images?.original?.url || ""
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Get Search Suggestions (Related Terms)
 * Maps roughly to related terms, but reusing autocomplete for simplicity
 * if specific endpoint isn't needed. Giphy has 'tags/related/{term}'.
 */
export async function getSearchSuggestions(query) {
    return getAutocomplete(query); // Giphy merges these concepts mostly
}
