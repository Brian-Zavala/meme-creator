// src/services/tenor.js
const API_KEY = import.meta.env.VITE_TENOR_KEY;
const CLIENT_KEY = "meme-creator-app";

export async function searchTenor(query, type = 'gif') {
  // If no query, we use the 'featured' endpoint to get trending GIFs
  const endpoint = query ? 'search' : 'featured';
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  
  // ADD search filter for stickers based on documentation
  const searchFilter = type === 'sticker' ? '&searchfilter=sticker' : '';

  const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${API_KEY}&client_key=${CLIENT_KEY}&limit=50&media_filter=gif,mediumgif${queryParam}${searchFilter}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Tenor API Error:", data.error.message);
      return [];
    }

    // Map Tenor results to match the structure your App expects (width/height/url)
    return data.results.map((item) => ({
      id: item.id,
      name: item.content_description || query,
      url: item.media_formats.gif.url, // High-quality GIF
      shareUrl: item.media_formats.mediumgif ? item.media_formats.mediumgif.url : item.media_formats.gif.url, // Optimized for sharing
      width: item.media_formats.gif.dims[0],
      height: item.media_formats.gif.dims[1],
    }));
  } catch (error) {
    console.error("Network Error:", error);
    return [];
  }
}

export async function registerShare(id, query) {
  if (!id) return;
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const url = `https://tenor.googleapis.com/v2/registershare?key=${API_KEY}&client_key=${CLIENT_KEY}&id=${id}${queryParam}`;

  try {
    // Fire and forget - we don't need to wait for the response
    fetch(url); 
  } catch (e) {
    console.warn("Failed to register share event", e);
  }
}

export async function getAutocomplete(query) {
  if (!query || query.length < 2) return [];
  const url = `https://tenor.googleapis.com/v2/autocomplete?key=${API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=5`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error("Tenor Autocomplete Error:", e);
    return [];
  }
}

export async function getSearchSuggestions(query) {
  if (!query) return [];
  const url = `https://tenor.googleapis.com/v2/search_suggestions?key=${API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=5`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error("Tenor Suggestions Error:", e);
    return [];
  }
}

export async function getCategories() {
  const url = `https://tenor.googleapis.com/v2/categories?key=${API_KEY}&client_key=${CLIENT_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.tags || []; // Returns array of { searchterm, path, image, name }
  } catch (e) {
    console.error("Tenor Categories Error:", e);
    return [];
  }
}
