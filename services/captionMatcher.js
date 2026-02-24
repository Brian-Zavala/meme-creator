// services/captionMatcher.js
// Pure function: takes assetMeta { raw, source } → returns up to 3 caption pairs.
// Zero API calls. Zero side effects.

import { CAPTION_BANK, TOKEN_TOPIC_MAP } from '../constants/captionBank.js';
import { TEMPLATE_KEYWORDS } from '../constants/memeIQKeywords.js';

const STOPWORDS = new Set([
  'a','an','the','in','on','at','of','to','is','it','this','that','with',
  'and','or','for','by','from','as','are','was','were','be','been','being',
  'have','has','had','do','does','did','but','if','then','than','so','yet',
  'nor','not','no','up','out','about','into','through','over','after',
  'before','between','under','since','during','against','without','within',
  'along','following','across','behind','beyond','plus','except','until',
  'its','his','her','their','our','your','my','we','he','she','they','i',
  'me','him','us','them','what','when','where','who','which','how','all',
  'each','both','more','most','other','some','such','just','than','too',
  'very','can','will','would','could','should','may','might','shall','must',
]);

/**
 * Tokenize a raw description string into lowercase words, filtering stopwords.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[\s\-_,./!?()[\]"']+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Given asset metadata, return up to 3 caption suggestion pairs.
 * Returns an empty array if no topics match.
 *
 * @param {{ raw: string, source: string }} assetMeta
 * @returns {Array<{ top: string, bottom: string }>}
 */
export function matchCaptions(assetMeta) {
  if (!assetMeta || typeof assetMeta.raw !== 'string' || !assetMeta.raw.trim()) {
    return [];
  }

  let tokens = tokenize(assetMeta.raw);

  // For imgflip templates: enrich token list with the template's own keyword map.
  // This gives much richer topic signals than tokenizing "Drake Hotline Bling" alone.
  if (assetMeta.source === 'imgflip') {
    const templateKeywords = TEMPLATE_KEYWORDS[assetMeta.raw];
    if (Array.isArray(templateKeywords)) {
      // Only add single-word keywords (multi-word phrases aren't in TOKEN_TOPIC_MAP)
      const extra = templateKeywords.filter(kw => !kw.includes(' '));
      tokens = [...new Set([...tokens, ...extra])];
    }
  }

  if (tokens.length === 0) return [];

  // Score each topic: count how many of its keywords appear in the token list.
  const tokenSet = new Set(tokens);
  const scores = {};
  for (const [topic, keywords] of Object.entries(TOKEN_TOPIC_MAP)) {
    const score = keywords.filter(kw => tokenSet.has(kw)).length;
    if (score > 0) scores[topic] = score;
  }

  // Pick the top 3 topics by score, deduplicated.
  const topTopics = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  if (topTopics.length === 0) return [];

  // Return the first caption pair from each matched topic.
  return topTopics
    .map(topic => {
      const pairs = CAPTION_BANK[topic];
      return Array.isArray(pairs) && pairs.length > 0 ? pairs[0] : null;
    })
    .filter(Boolean);
}
