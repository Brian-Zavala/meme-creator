
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export async function handler(event) {
  if (!PEXELS_API_KEY) {
    console.error("Missing PEXELS_API_KEY environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  const { query, page = "1", per_page = "30", endpoint = "search", type = "photo" } = event.queryStringParameters || {};

  // For search, query is required. For curated/popular, it's not.
  if (endpoint === "search" && !query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing query parameter" }),
    };
  }

  const params = new URLSearchParams({
    page,
    per_page,
  });

  if (endpoint === "search") {
    params.append("query", query);
  }

  // Base URL depends on type (photo vs video)
  const isVideo = type === "video";
  const baseUrl = isVideo ? "https://api.pexels.com/videos" : "https://api.pexels.com/v1";

  // Endpoint mapping
  // Photo: /v1/search, /v1/curated
  // Video: /videos/search, /videos/popular
  let targetPath = "";
  if (endpoint === "search") targetPath = "/search";
  else if (endpoint === "curated") targetPath = isVideo ? "/popular" : "/curated";
  else targetPath = "/search"; // fallback

  const targetUrl = `${baseUrl}${targetPath}`;

  try {
    const response = await fetch(
      `${targetUrl}?${params}`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Pexels API Error" }),
      };
    }

    const data = await response.json();

    // Bandwidth optimization: strip to only essential fields
    const photos = (data.photos || []).map((p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      alt: p.alt || "",
      photographer: p.photographer || "Unknown",
      photographer_url: p.photographer_url || "",
      src_medium: p.src?.medium || "",
      src_large2x: p.src?.large2x || "",
      src_original: p.src?.original || "",
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify({
        photos,
        videos: data.videos || [],
        total_results: data.total_results || 0,
      }),
    };
  } catch (error) {
    console.error("Error fetching from Pexels:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from Pexels" }),
    };
  }
}
