
const API_KEY = process.env.GIPHY_KEY || process.env.VITE_GIPHY_KEY;

export async function handler(event, context) {
  if (!API_KEY) {
    console.error("Missing GIPHY_KEY environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  const { queryStringParameters, path } = event;
  const { type = 'gifs', endpoint = 'search', q, limit = '50', offset = '0' } = queryStringParameters || {};

  // Construct Giphy API URL
  // Supported types: 'gifs', 'stickers'
  // Supported endpoints: 'search', 'trending', 'categories', 'search/tags' (for autocomplete)

  // Base setup
  const baseUrl = "https://api.giphy.com/v1";
  let targetUrl = `${baseUrl}/${type}/${endpoint}`;

  // Handle specific endpoints that might differ slightly or need mapping
  // We'll trust the client to send valid structure mostly, but sanitizing strictly is better.

  // Construct URL parameters
  const params = new URLSearchParams({
    api_key: API_KEY,
    limit: limit,
    offset: offset,
    rating: 'g', // Force G rating
  });

  if (q) {
    params.append('q', q);
  }

  try {
    const response = await fetch(`${targetUrl}?${params.toString()}`);

    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: "Giphy API Error" })
        }
    }

    const data = await response.json();

    let optimizedData = [];

    // Bandwidth Optimization: Filter based on endpoint type
    if (endpoint.includes('tags')) {
        // Autocomplete: just needs names
        optimizedData = (data.data || []).map(item => ({ name: item.name }));
    } else if (endpoint.includes('categories')) {
        // Categories: needs name and the cover GIF
        optimizedData = (data.data || []).map(item => ({
            name: item.name,
            gif: item.gif ? {
                images: {
                    original: { url: item.gif.images?.original?.url },
                    fixed_height: { url: item.gif.images?.fixed_height?.url }
                }
            } : null
        }));
    } else {
        // Standard GIF Search/Trending
        optimizedData = (data.data || []).map(item => ({
            id: item.id,
            title: item.title,
            import_datetime: item.import_datetime,
            images: {
                original: {
                    url: item.images?.original?.url,
                    width: item.images?.original?.width,
                    height: item.images?.original?.height
                },
                fixed_height: {
                    url: item.images?.fixed_height?.url
                }
            }
        }));
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      },
      body: JSON.stringify({ data: optimizedData, meta: { status: 200, msg: "OK" } }),
    };
  } catch (error) {
    console.error("Error fetching from Giphy:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from Giphy" }),
    };
  }
};
