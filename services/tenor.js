// src/services/tenor.js
const API_KEY = import.meta.env.VITE_TENOR_KEY;
const CLIENT_KEY = "meme-creator-app";

export async function searchTenor(query, type = 'gif') {
  const endpoint = query ? 'search' : 'featured';
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  
  // 1. Tell Tenor we want stickers if type is 'sticker'
  const searchFilter = type === 'sticker' ? '&searchfilter=sticker' : '';

  // 2. Request 'gif_transparent' specifically for stickers
  // We ask for 'gif,mediumgif' (standard) AND 'gif_transparent,tinygif_transparent' (stickers)
  const mediaFilter = '&media_filter=gif,mediumgif,gif_transparent,tinygif_transparent';
  
  const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${API_KEY}&client_key=${CLIENT_KEY}&limit=50${mediaFilter}${queryParam}${searchFilter}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Tenor API Error:", data.error.message);
      return [];
    }

    return data.results.map((item) => {
      // 3. SMART SELECTION LOGIC
      // If we have a transparent GIF format, USE IT. Otherwise fallback to standard GIF.
      const bestFormat = item.media_formats.gif_transparent || item.media_formats.gif;
      const previewFormat = item.media_formats.tinygif_transparent || item.media_formats.mediumgif || item.media_formats.gif;

      return {
        id: item.id,
        name: item.content_description || query,
        url: bestFormat.url, // This will now be transparent!
        shareUrl: previewFormat.url,
        width: bestFormat.dims[0],
        height: bestFormat.dims[1],
      };
    });
  } catch (error) {
    console.error("Network Error:", error);
    return [];
  }
}

export async function registerShare(id, query) {
  if (!id) return;
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const url = `https://tenor.googleapis.com/v2/registershare?key=${API_KEY}&client_key=${CLIENT_KEY}&id=${id}${queryParam}`;
  try { fetch(url); } catch (e) { console.warn(e); }
}

export async function getAutocomplete(query) {
  if (!query || query.length < 2) return [];
  const url = `https://tenor.googleapis.com/v2/autocomplete?key=${API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=5`;
  try { const res = await fetch(url); const data = await res.json(); return data.results || []; } catch (e) { return []; }
}

export async function getSearchSuggestions(query) {
  if (!query) return [];
  const url = `https://tenor.googleapis.com/v2/search_suggestions?key=${API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=5`;
  try { const res = await fetch(url); const data = await res.json(); return data.results || []; } catch (e) { return []; }
}

export async function getCategories() {
  const url = `https://tenor.googleapis.com/v2/categories?key=${API_KEY}&client_key=${CLIENT_KEY}`;
  try { const res = await fetch(url); const data = await res.json(); return data.tags || []; } catch (e) { return []; }
}
