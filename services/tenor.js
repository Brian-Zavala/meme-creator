// src/services/tenor.js
const API_KEY = import.meta.env.VITE_TENOR_KEY;
const CLIENT_KEY = "meme-creator-app";

export async function searchTenor(query) {
  // If no query, we use the 'featured' endpoint to get trending GIFs
  const endpoint = query ? 'search' : 'featured';
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  
  const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${API_KEY}&client_key=${CLIENT_KEY}&limit=50&media_filter=gif${queryParam}`;

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
      width: item.media_formats.gif.dims[0],
      height: item.media_formats.gif.dims[1],
    }));
  } catch (error) {
    console.error("Network Error:", error);
    return [];
  }
}
