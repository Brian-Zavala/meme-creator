export default async (req, context) => {
  const url = new URL(req.url);
  const fileUrl = url.searchParams.get("url");
  const type = url.searchParams.get("type") || "image"; // 'image', 'video', 'gif'
  const title = url.searchParams.get("title") || "Check out my meme!";

  if (!fileUrl) {
    return new Response("Missing 'url' query parameter", { status: 400 });
  }

  // Basic HTML with Open Graph tags
  // We use a "player" card for videos/GIFs to encourage inline playback
  // For standard images, summary_large_image is best.

  let metaTags = "";
  let redirectUrl = fileUrl;

  // Security: Ensure we are only proxying trusted domains if strictness is needed.
  // For now, we allow any, but in production, we might want to limit to tmpfiles.org or our own domains.
  // const allowedDomains = ['tmpfiles.org'];

  const cleanTitle = title.replace(/"/g, '&quot;');

  if (type === 'video' || type === 'gif') {
    metaTags = `
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@memestudio" />
      <meta name="twitter:title" content="${cleanTitle}" />
      <meta name="twitter:description" content="Made with Meme Creator" />
      <meta name="twitter:player" content="${fileUrl}" />
      <meta name="twitter:player:width" content="600" />
      <meta name="twitter:player:height" content="600" />

      <meta property="og:title" content="${cleanTitle}" />
      <meta property="og:description" content="Made with Meme Creator" />
      <meta property="og:type" content="video.other" />
      <meta property="og:video" content="${fileUrl}" />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:video:width" content="600" />
      <meta property="og:video:height" content="600" />
      <meta property="og:image" content="${fileUrl}" />
    `;
    // Note: og:image for video is often the poster. If it's a raw mp4/gif, using it as image *might* work
    // depending on the platform, but ideally we'd have a separate thumbnail.
    // Discord/iMessage are usually smart enough to grab the first frame if the server supports range requests.
    // tmpfiles.org supports range requests.
  } else {
    metaTags = `
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${cleanTitle}" />
      <meta property="og:title" content="${cleanTitle}" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="${fileUrl}" />
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cleanTitle}</title>
    ${metaTags}

    <!-- Instant Redirect for Humans -->
    <meta http-equiv="refresh" content="0;url=${redirectUrl}">
</head>
<body>
    <p>Redirecting to <a href="${redirectUrl}">meme...</a></p>
    <script>window.location.href = "${redirectUrl}"</script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=0, must-revalidate" // Don't cache the proxy itself too aggressively
    }
  });
};
