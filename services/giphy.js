// No API KEY needed on client side anymore
// const API_KEY = import.meta.env.VITE_GIPHY_KEY;

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
 * Search GIPHY for GIFs or Stickers via Netlify Function
 * @param {string} query - Search term
 * @param {string} type - 'gif' or 'sticker'
 * @returns {Promise<Array>}
 */
export async function searchGiphy(query, type = 'gif') {
  const isSticker = type === 'sticker';
  const resourceType = isSticker ? 'stickers' : 'gifs';
  const endpoint = query ? 'search' : 'trending';

  // Construct URL to our own Netlify Function
  let url = `/.netlify/functions/giphy?type=${resourceType}&endpoint=${endpoint}&limit=50`;

  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
    }
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
  // Logic remains same (placeholder)
}

/**
 * Get Autocomplete suggestions via Proxy
 * @param {string} query
 */
export async function getAutocomplete(query) {
  if (!query || query.length < 2) return [];

  // We map this to gifs/search/tags in the proxy logic or pass explicitly
  // Let's pass parameters that the proxy understands.
  // The proxy is generic: /type/endpoint
  // Giphy autocomplete endpoint is: /gifs/search/tags

  const url = `/.netlify/functions/giphy?type=gifs&endpoint=search/tags&q=${encodeURIComponent(query)}&limit=5`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.data || []).map(item => item.name);
  } catch (e) {
    return [];
  }
}

/**
 * Get Categories (Tags) via Proxy
 */
export async function getCategories() {
  const url = `/.netlify/functions/giphy?type=gifs&endpoint=categories`;
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
