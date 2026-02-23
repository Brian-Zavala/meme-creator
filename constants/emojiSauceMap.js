// constants/emojiSauceMap.js

/**
 * Maps contextual keywords to relevant emojis.
 * This is used by the "Emoji Sauce" feature to auto-suggest
 * stickers based on the current meme caption.
 */
export const EMOJI_CONTEXT_MAP = {
  fire: {
    keywords: ["fire", "hot", "lit", "burn", "flame", "crazy", "wild", "insane", "banger", "w", "peak", "gas", "cook", "cooking", "let him cook"],
    emojis: ["🔥", "🧨", "🌶️", "🌋"]
  },
  skull: {
    keywords: ["dead", "dying", "kill", "rip", "bruh", "done", "over", "cooked", "bro", "dude", "nah", "fr", "for real", "ain't no way", "wild"],
    emojis: ["💀", "☠️", "🪦", "👻"]
  },
  cry: {
    keywords: ["sad", "cry", "tears", "pain", "hurt", "alone", "depressed", "why", "broken", "depressing", "sob", "crying"],
    emojis: ["😭", "😢", "🥺", "🥀"]
  },
  clown: {
    keywords: ["clown", "fool", "joke", "circus", "stupid", "dumb", "idiot", "silly", "goofy", "l", "ratio", "trash", "bad"],
    emojis: ["🤡", "🎪", "🃏", "🤪"]
  },
  love: {
    keywords: ["love", "heart", "cute", "sweet", "bae", "babe", "darling", "beautiful", "gorgeous", "rizz", "rizzler"],
    emojis: ["❤️", "😍", "🥰", "🫶"]
  },
  money: {
    keywords: ["money", "cash", "rich", "bag", "secure", "wealth", "paid", "broke", "expensive", "grind", "hustle"],
    emojis: ["💸", "💰", "🤑", "💵"]
  },
  anger: {
    keywords: ["mad", "angry", "rage", "furious", "hate", "pissed", "annoyed", "why", "frustrating"],
    emojis: ["🤬", "😡", "😤", "💢"]
  },
  laugh: {
    keywords: ["haha", "lmao", "lol", "rofl", "funny", "hilarious", "dead", "lmfao", "ha"],
    emojis: ["😂", "🤣", "😹", "😆"]
  },
  cap: {
    keywords: ["cap", "lie", "liar", "fake", "false", "untrue", "capping"],
    emojis: ["🧢"]
  },
  sus: {
    keywords: ["sus", "suspicious", "weird", "hmm", "creepy", "impostor", "what"],
    emojis: ["🤨", "👀", "🕵️", "🚨"]
  },
  brain: {
    keywords: ["brain", "smart", "genius", "iq", "think", "mind", "galaxy", "big brain", "nerd", "actually"],
    emojis: ["🧠", "🤓", "💡", "🤯"]
  },
  food: {
    keywords: ["food", "eat", "hungry", "snack", "meal", "dinner", "lunch", "breakfast", "starving"],
    emojis: ["🍕", "🍔", "🌮", "🍟"]
  },
  sleep: {
    keywords: ["sleep", "tired", "bed", "nap", "exhausted", "lazy", "sleepy", "yawn"],
    emojis: ["😴", "🛌", "🥱", "💤"]
  },
  party: {
    keywords: ["party", "celebrate", "weekend", "club", "dance", "drink", "drunk", "party time"],
    emojis: ["🎉", "🥳", "🍾", "🥂"]
  },
  time: {
    keywords: ["time", "late", "early", "wait", "patient", "hurry", "oclock", "waiting"],
    emojis: ["⏰", "⏳", "⌚"]
  },
  magic: {
    keywords: ["magic", "wizard", "spell", "poof", "wow", "amaze", "miracle"],
    emojis: ["✨", "🪄", "🔮"]
  },
  work: {
    keywords: ["work", "job", "grind", "office", "boss", "monday", "shift", "coworker"],
    emojis: ["💼", "💻", "😫", "📈"]
  },
  sigma: {
    keywords: ["sigma", "chad", "based", "alpha", "grindset", "mewing", "looksmaxxing"],
    emojis: ["🗿", "🍷", "💪"]
  }
};

// Universal fallback emojis that fit almost any meme context
export const FALLBACK_EMOJIS = ["💀", "🔥", "💯", "😂", "😭", "🗣️", "👀", "🥶", "🤯", "😎", "🤔", "💪", "🤷", "🫠"];

// Pre-compiled regex cache so the text analysis doesn't build patterns on every UI click
export const COMPILED_EMOJI_MAP = Object.entries(EMOJI_CONTEXT_MAP).map(([category, data]) => ({
  category: category,
  emojis: data.emojis,
  regexes: data.keywords.map(kw => {
    // Regex logic correctly skips punctuation characters inside the matched sentence.
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  })
}));
