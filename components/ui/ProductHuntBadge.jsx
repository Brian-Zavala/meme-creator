/**
 * Product Hunt Launch Badge
 * Displays the Product Hunt "Featured" badge for launch week voter siphon strategy.
 * Positioned below download/share buttons to capture traffic without disrupting UX.
 * Uses locally-hosted SVG to avoid CORS/API blocking issues.
 */
export function ProductHuntBadge() {
  return (
    <div className="flex justify-center items-center py-4 px-2">
      <a
        href="https://www.producthunt.com/products/meme-creator-3?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-meme-creator-3"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-slate-900 rounded-lg"
      >
        <img
          src="/producthunt-badge.svg"
          alt="Meme Creator on Product Hunt"
          className="w-full max-w-[250px] h-auto"
          width="250"
          height="54"
        />
      </a>
    </div>
  );
}
