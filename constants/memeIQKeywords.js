/**
 * Meme IQ — Template Keyword Map
 *
 * Built from the imgflip top-100 API (api.imgflip.com/get_memes).
 * Each key maps an imgflip template name to an array of trigger keywords.
 * Keyword scoring: count how many tokens from user text appear in the list.
 * All keys match m.name exactly as returned by the API.
 */

/** Minimum keyword score to recommend a named template (vs. trending fallback) */
export const MEME_IQ_THRESHOLD = 1;

/**
 * Maps template name → array of trigger keywords (lowercase tokens).
 * Keywords are curated per the semantic meaning of each template.
 */
export const TEMPLATE_KEYWORDS = {
  // ── Ranking / preference ─────────────────────────────────────────────────
  "Drake Hotline Bling": [
    "choose", "prefer", "better", "vs", "instead", "rather", "over",
    "nah", "yes", "no thanks", "hell no", "hell yes", "pick", "option",
    "approve", "reject", "like", "dislike", "love", "hate"
  ],

  // ── Decision paralysis ───────────────────────────────────────────────────
  "Two Buttons": [
    "decision", "choose", "both", "either", "option", "dilemma",
    "button", "press", "panic", "stressed", "cant decide", "confused",
    "simultaneously", "at the same time"
  ],

  // ── Attention / temptation ───────────────────────────────────────────────
  "Distracted Boyfriend": [
    "distracted", "cheat", "look", "notice", "ignore", "attracted",
    "lured", "tempted", "focus", "want", "desire", "attention", "girlfriend"
  ],

  // ── Asking / begging ────────────────────────────────────────────────────
  "Bernie I Am Once Again Asking For Your Support": [
    "asking", "again", "once more", "support", "asking for", "beg", "plea",
    "please", "need", "donation", "help", "request"
  ],
  "Bernie Sanders Once Again Asking": [
    "asking", "again", "support", "beg", "plea", "request", "money"
  ],

  // ── Refusing / avoiding ──────────────────────────────────────────────────
  "UNO Draw 25 Cards": [
    "refuse", "draw", "rather", "avoid", "skip", "nope", "no way",
    "default", "shortcut", "lazy", "easy way", "alternative"
  ],

  // ── Distraction / exit ───────────────────────────────────────────────────
  "Left Exit 12 Off Ramp": [
    "exit", "leave", "escape", "abandon", "switch", "detour", "pivot",
    "instead of", "reroute", "give up"
  ],

  // ── Safe / relief ────────────────────────────────────────────────────────
  "Marked Safe From": [
    "safe", "survived", "avoided", "protected", "escaped", "immune",
    "unaffected", "dodged"
  ],

  // ── Reveal / "always was" ────────────────────────────────────────────────
  "Always Has Been": [
    "always", "been", "was", "whole time", "entire", "duh", "obviously",
    "wait always", "this whole time"
  ],

  // ── Ignoring / chasing ───────────────────────────────────────────────────
  "Running Away Balloon": [
    "running", "chasing", "ignore", "distraction", "focus", "obsessed",
    "forget", "abandoning"
  ],

  // ── Chaos / mischief ────────────────────────────────────────────────────
  "Disaster Girl": [
    "chaos", "evil", "fire", "destructive", "mischief", "watching burn",
    "smirk", "not caring", "villain", "disaster", "burned down"
  ],

  // ── Waiting / boredom ────────────────────────────────────────────────────
  "Sad Pablo Escobar": [
    "waiting", "bored", "nothing to do", "sad", "lonely", "empty",
    "when there is no", "when nobody"
  ],
  "Waiting Skeleton": [
    "waiting", "forever", "still waiting", "been waiting", "patience",
    "loading", "slow", "never coming"
  ],

  // ── Plan fails ───────────────────────────────────────────────────────────
  "Gru's Plan": [
    "plan", "backfire", "wait", "mistake", "fail", "realization",
    "genius", "step", "except", "oops", "plot twist"
  ],

  // ── Agreement / alliance ────────────────────────────────────────────────
  "Epic Handshake": [
    "agree", "both", "united", "common", "alliance", "together",
    "we both", "share", "mutual", "same"
  ],

  // ── Reality check / assumption ────────────────────────────────────────────
  "Anakin Padme 4 Panel": [
    "right", "of course", "obviously", "surely", "wait", "silence",
    "assumption", "expectation", "awkward", "dread"
  ],

  // ── Opinion / debate ────────────────────────────────────────────────────
  "Change My Mind": [
    "change", "opinion", "debate", "prove", "wrong", "fact",
    "fight me", "unpopular", "controversial", "hot take", "my mind"
  ],

  // ── Slapping / shutting down ──────────────────────────────────────────────
  "Batman Slapping Robin": [
    "stop", "dont", "shut", "smack", "correct", "no one asked",
    "wrong", "slap", "cut it out", "enough"
  ],

  // ── Everywhere / excessive ───────────────────────────────────────────────
  "X, X Everywhere": [
    "everywhere", "all over", "everywhere i look", "cant escape",
    "every time", "constant", "nothing but"
  ],

  // ── Mocking / mimicking ──────────────────────────────────────────────────
  "Mocking Spongebob": [
    "mock", "mimic", "sarcasm", "repeat", "copy", "squawk",
    "making fun", "ironic", "stupid voice"
  ],

  // ── Versus / strong vs weak ──────────────────────────────────────────────
  "Buff Doge vs. Cheems": [
    "strong", "weak", "old vs new", "then vs now", "back then", "nowadays",
    "used to", "we used to", "vs", "comparison"
  ],

  // ── Arguing / yelling ────────────────────────────────────────────────────
  "Woman Yelling At Cat": [
    "yell", "argue", "angry", "yelling", "confrontation", "unimpressed",
    "defensive", "calm", "stare", "confused cat"
  ],

  // ── Trade / deal ─────────────────────────────────────────────────────────
  "Trade Offer": [
    "trade", "deal", "offer", "receive", "give", "swap", "exchange",
    "i receive", "you receive", "fair deal"
  ],

  // ── Craving / need ───────────────────────────────────────────────────────
  "Y'all Got Any More Of That": [
    "need more", "give me", "craving", "addicted", "more", "again",
    "cant stop", "obsessed", "more please"
  ],

  // ── Impossible / gate-keeping ────────────────────────────────────────────
  "One Does Not Simply": [
    "simply", "easy", "just", "cannot", "impossible", "one does not",
    "walk", "hard", "try", "attempt"
  ],

  // ── Achievement / small win ──────────────────────────────────────────────
  "Success Kid": [
    "finally", "success", "win", "yes", "achieved", "nailed",
    "first try", "worked", "proud", "did it"
  ],

  // ── Misidentifying / confusing ───────────────────────────────────────────
  "Is This A Pigeon": [
    "butterfly", "pigeon", "is this", "mistake", "confuse", "misidentify",
    "calling", "label", "that a", "thinking that"
  ],
  "is this butterfly": [
    "butterfly", "is this", "mistake", "confuse", "misidentify"
  ],

  // ── Safety / protection ───────────────────────────────────────────────────
  "Soldier protecting sleeping child": [
    "protect", "defend", "guardian", "safe", "covering", "important",
    "shielding", "guarding", "priority"
  ],

  // ── Falling / failing dramatically ───────────────────────────────────────
  "Bike Fall": [
    "fall", "fail", "own fault", "karma", "self-inflicted", "caused it",
    "tripped", "stick", "wreck"
  ],

  // ── Aliens / explanations ────────────────────────────────────────────────
  "Ancient Aliens": [
    "aliens", "explain", "conspiracy", "how", "mystery", "ancient",
    "unexplained", "could it be", "theory", "ufo"
  ],

  // ── Brain size / smart takes ─────────────────────────────────────────────
  "Expanding Brain": [
    "galaxy brain", "smart", "genius", "evolving", "advanced", "next level",
    "big brain", "enlightened", "upgrade", "tier", "galaxy"
  ],

  // ── Ignoring priorities ───────────────────────────────────────────────────
  "Mother Ignoring Kid Drowning In A Pool": [
    "ignore", "distracted", "priorities", "emergency", "neglect",
    "more important", "obsessed", "not noticing"
  ],

  // ── Classy vs basic ─────────────────────────────────────────────────────
  "Tuxedo Winnie The Pooh": [
    "classy", "fancy", "sophisticated", "posh", "same but better",
    "elegant", "superior", "refined", "high end", "but make it"
  ],

  // ── They're the same ────────────────────────────────────────────────────
  "They're The Same Picture": [
    "same", "identical", "difference", "barely different", "no difference",
    "copy", "spot the difference", "basically the same"
  ],

  // ── Thinking / suspicion ─────────────────────────────────────────────────
  "I Bet He's Thinking About Other Women": [
    "thinking about", "wondering", "daydreaming", "plotting", "what are you thinking",
    "probably thinking", "not thinking about me"
  ],

  // ── Payment / expected reward ────────────────────────────────────────────
  "You Guys are Getting Paid": [
    "paid", "salary", "reward", "compensation", "volunteer", "free",
    "payment", "getting paid", "working for free"
  ],

  // ── Empty promise / trophy ───────────────────────────────────────────────
  "This Is Where I'd Put My Trophy If I Had One": [
    "trophy", "achievement", "empty", "no achievement", "no reward",
    "winning", "if i had", "placeholder"
  ],

  // ── Peek / lurking ───────────────────────────────────────────────────────
  "Megamind peeking": [
    "peeking", "watching", "lurking", "observing", "spying", "sneaking",
    "curious", "checking in"
  ],
  "Megamind no bitches": [
    "no friends", "alone", "forever alone", "no one", "single",
    "no luck", "rejected", "loser"
  ],

  // ── Giving / sharing ────────────────────────────────────────────────────
  "Oprah You Get A": [
    "everyone", "you get", "giving", "sharing", "all of you", "free",
    "giveaway", "gift"
  ],

  // ── Awkward / out of place ───────────────────────────────────────────────
  "Monkey Puppet": [
    "awkward", "side eye", "nervous smile", "uncomfortable", "forced",
    "fake it", "pretend", "oh no", "uh oh"
  ],

  // ── Denial / everything fine ─────────────────────────────────────────────
  "This Is Fine": [
    "fine", "chaos", "burning", "ignore", "pretend", "okay", "disaster",
    "everything fine", "not fine", "cope"
  ],

  // ── Becoming what you hate ───────────────────────────────────────────────
  "Clown Applying Makeup": [
    "clown", "fool", "joke", "circus", "playing yourself", "fooling",
    "idiot", "they got you", "becoming", "irony"
  ],

  // ── Jealousy / watching ──────────────────────────────────────────────────
  "Squidward window": [
    "jealous", "watching", "window", "looking", "observing", "lurking",
    "left out", "not invited", "outsider", "envy"
  ],

  // ── Not sure / uncertainty ───────────────────────────────────────────────
  "Futurama Fry": [
    "not sure", "squinting", "suspicious", "possibly", "maybe", "unsure",
    "could be", "might be", "skeptical"
  ],

  // ── Hiding pain / forced smile ────────────────────────────────────────────
  "Hide the Pain Harold": [
    "hiding", "pain", "forced smile", "fake happy", "pretend", "suffer",
    "smile through", "its fine", "dying inside"
  ],

  // ── Laughing / ridicule ──────────────────────────────────────────────────
  "Laughing Leo": [
    "laughing", "ridiculous", "hilarious", "joke", "seriously",
    "cannot believe", "absurd", "roast", "really"
  ],

  // ── Meeting suggestion ───────────────────────────────────────────────────
  "Boardroom Meeting Suggestion": [
    "idea", "suggestion", "what if", "proposal", "meeting", "boss",
    "shot down", "rejected", "fired"
  ],

  // ── Best offer ───────────────────────────────────────────────────────────
  "Pawn Stars Best I Can Do": [
    "best i can do", "offer", "deal", "negotiate", "lowball", "compromise",
    "take it or leave", "final offer"
  ],

  // ── Pointing / blame ─────────────────────────────────────────────────────
  "Spider Man Triple": [
    "pointing", "blame", "same", "accuse", "hypocrite", "guilty",
    "who did it", "both responsible"
  ],
  "spiderman pointing at spiderman": [
    "pointing", "same person", "both", "hypocrite", "accuse", "identical"
  ],

  // ── Big brain logic ───────────────────────────────────────────────────────
  "Roll Safe Think About It": [
    "cant", "lose", "smart trick", "avoid", "loophole", "technically",
    "if you never", "big brain", "logic"
  ],

  // ── Bell curve / midwit ──────────────────────────────────────────────────
  "Bell Curve": [
    "dumb", "smart", "same conclusion", "irony", "extreme same",
    "midwit", "iq", "bell curve", "contrarian"
  ],

  // ── They don't know ──────────────────────────────────────────────────────
  "They don't know": [
    "nobody knows", "party", "standing alone", "secret", "only one",
    "they dont know", "hidden talent", "unaware"
  ],

  // ── Cheers / celebration ─────────────────────────────────────────────────
  "Leonardo Dicaprio Cheers": [
    "cheers", "toast", "celebrate", "there it is", "found it", "thats it",
    "finally", "moment", "spotted"
  ],

  // ── Hiding / running ─────────────────────────────────────────────────────
  "Anime Girl Hiding from Terminator": [
    "hiding", "running from", "fear", "avoiding", "phobia", "chased",
    "anxiety", "escaping", "terrified"
  ],

  // ── Already asleep ───────────────────────────────────────────────────────
  "Sleeping Shaq": [
    "boring", "uninterested", "asleep", "tired of", "dont care",
    "wake up", "exciting", "suddenly awake", "boring vs exciting"
  ],

  // ── Ending friendship ─────────────────────────────────────────────────────
  "Friendship ended": [
    "end", "friendship", "done", "replaced", "new best friend", "over",
    "bye", "finished", "dumped", "switched"
  ],

  // ── Quick fix / tape ────────────────────────────────────────────────────
  "Flex Tape": [
    "fix", "patch", "repair", "solve", "tape", "quick fix",
    "bandaid", "temporary", "covering up", "solution"
  ],

  // ── Excitement / nut button ──────────────────────────────────────────────
  "Blank Nut Button": [
    "excited", "button", "trigger", "cant help", "every time",
    "cant stop pressing", "temptation", "irresistible"
  ],

  // ── Surprise / shocked ────────────────────────────────────────────────────
  "Surprised Pikachu": [
    "surprised", "shocked", "unexpected", "gasp", "really",
    "how could this happen", "pikachu", "face", "wow", "cant believe"
  ],

  // ── Inner vs outer ───────────────────────────────────────────────────────
  "Evil Kermit": [
    "inner", "devil", "temptation", "voice", "evil", "dark side",
    "conscience", "should not", "but you will"
  ],

  // ── Wisdom / advice ──────────────────────────────────────────────────────
  "Star Wars Yoda": [
    "yoda", "wisdom", "backwards", "wise", "advice", "strong force",
    "patience", "master", "do or do not"
  ],

  // ── Collective hate ──────────────────────────────────────────────────────
  "All My Homies Hate": [
    "hate", "homies", "unanimously", "everyone hates", "f that",
    "squad agrees", "we all hate"
  ],

  // ── Panic / calm / panic ─────────────────────────────────────────────────
  "Panik Kalm Panik": [
    "panic", "calm", "relief", "then panic again", "rollercoaster",
    "moment of peace", "false hope", "back to panic"
  ],

  // ── Internet / grandma ───────────────────────────────────────────────────
  "Grandma Finds The Internet": [
    "internet", "online", "grandma", "confused", "discovered", "new to",
    "technology", "shocked", "first time", "reaction"
  ],

  // ── Escalating argument ──────────────────────────────────────────────────
  "American Chopper Argument": [
    "argument", "fight", "escalate", "back and forth", "heated",
    "disagree", "debate", "bicker"
  ],

  // ── Crazy theory ─────────────────────────────────────────────────────────
  "Charlie Conspiracy (Always Sunny in Philidelphia)": [
    "conspiracy", "theory", "connected", "string", "evidence", "crazy plan",
    "overthink", "figured it out", "board"
  ],

  // ── We are not the same ──────────────────────────────────────────────────
  "Gus Fring we are not the same": [
    "different", "not the same", "superior", "compare", "how dare",
    "distinctions", "we are not"
  ],

  // ── Can't believe ────────────────────────────────────────────────────────
  "The Rock Driving": [
    "really", "what", "driving", "reaction", "double take", "disbelief",
    "you serious", "wait what"
  ],

  // ── Scroll of truth ──────────────────────────────────────────────────────
  "The Scroll Of Truth": [
    "truth", "deny", "reject", "dont want to hear", "throw away",
    "uncomfortable truth", "facts", "real talk"
  ],

  // ── Interesting / impressive ─────────────────────────────────────────────
  "The Most Interesting Man In The World": [
    "dont always", "but when i do", "interesting", "rare", "occasionally",
    "stay thirsty", "sometimes", "once in a while"
  ],

  // ── Taking over / new captain ────────────────────────────────────────────
  "I'm The Captain Now": [
    "captain", "boss", "takeover", "power", "control", "now i run",
    "new management", "in charge", "who runs"
  ],

  // ── Looking / searching ───────────────────────────────────────────────────
  "Look At Me": [
    "look at me", "now i am", "you were", "switched", "new role",
    "upgrade", "became", "transitioned"
  ],

  // ── Two paths ────────────────────────────────────────────────────────────
  "Two Paths": [
    "path", "choice", "fork", "direction", "which way", "decision",
    "crossroads", "go left", "go right"
  ],

  // ── No - Yes (face) ──────────────────────────────────────────────────────
  "No - Yes": [
    "no yes", "change mind", "at first no", "actually yes", "convince",
    "persuaded", "talked into", "flip flop"
  ],

  // ── Shooting own foot ────────────────────────────────────────────────────
  "Who Killed Hannibal": [
    "own fault", "self inflicted", "why", "you did this", "own goal",
    "self sabotage", "blame yourself"
  ],

  // ── Say the line ─────────────────────────────────────────────────────────
  "say the line bart! simpsons": [
    "say it", "say the thing", "that phrase", "catchphrase",
    "come on say it", "tell them", "just say"
  ],

  // ── Days without ─────────────────────────────────────────────────────────
  "0 days without (Lenny, Simpsons)": [
    "days without", "incident", "record", "zero days", "again", "streak",
    "occurred", "happened again"
  ],

  // ── Domino effect ────────────────────────────────────────────────────────
  "Domino Effect": [
    "chain reaction", "domino", "one leads to", "starts with",
    "cascading", "consequence", "leads to disaster"
  ],

  // ── Reveal / unmask ───────────────────────────────────────────────────────
  "Scooby doo mask reveal": [
    "reveal", "unmask", "it was", "actually", "it's really",
    "behind the mask", "turns out", "exposed"
  ],

  // ── Ominous watching ─────────────────────────────────────────────────────
  "AJ Styles & Undertaker": [
    "watching", "death stare", "coming for you", "warning", "judgment",
    "you messed up"
  ],

  // ── Finding Neverland ────────────────────────────────────────────────────
  "Finding Neverland": [
    "imagination", "pretend", "magic", "believe", "actually",
    "if you think about it", "technically", "kind of"
  ],

  // ── Bugs bunny / presenting ───────────────────────────────────────────────
  "Bugs bunny communist": [
    "presenting", "introducing", "allow me", "behold", "welcome",
    "here it is", "announcing"
  ],

  // ── Competition ───────────────────────────────────────────────────────────
  "whe i'm in a competition and my opponent is": [
    "competition", "opponent", "competitor", "challenge", "up against",
    "in a competition", "rival"
  ],

  // ── Disappointed ─────────────────────────────────────────────────────────
  "Disappointed Black Guy": [
    "disappointed", "expected more", "let down", "really", "this",
    "that all", "unimpressed", "sad"
  ],

  // ── Grant Gustin / grave ─────────────────────────────────────────────────
  "Grant Gustin over grave": [
    "over", "above", "mourning", "rip", "dead", "finished", "the end",
    "grave", "goodbye"
  ],

  // ── George Bush ─────────────────────────────────────────────────────────
  "George Bush 9/11": [
    "continue", "reading", "pretend", "not notice", "ignoring",
    "keep going", "blank face"
  ],

  // ── Absolute cinema ──────────────────────────────────────────────────────
  "Absolute Cinema": [
    "cinema", "art", "masterpiece", "peak", "quality content",
    "chef kiss", "absolute", "peak performance"
  ],

  // ── Three-headed dragon / agreement ──────────────────────────────────────
  "Three-headed Dragon": [
    "three agrees", "unanimous", "all agree", "everyone thinks",
    "collective", "we all", "combination"
  ],
};

/**
 * Ordered list of "trending" templates for the random fallback.
 * Drawn from top-ranked imgflip templates by captions count.
 * All names match the API's `m.name` field exactly.
 */
export const TRENDING_TEMPLATES = [
  "Drake Hotline Bling",
  "Distracted Boyfriend",
  "Two Buttons",
  "Left Exit 12 Off Ramp",
  "Change My Mind",
  "Expanding Brain",
  "One Does Not Simply",
  "Mocking Spongebob",
  "Running Away Balloon",
  "Boardroom Meeting Suggestion",
  "Batman Slapping Robin",
  "Woman Yelling At Cat",
  "X, X Everywhere",
  "Surprised Pikachu",
  "Success Kid",
  "Futurama Fry",
  "UNO Draw 25 Cards",
  "Disaster Girl",
  "Waiting Skeleton",
  "This Is Fine",
  "Evil Kermit",
  "Gru's Plan",
  "Buff Doge vs. Cheems",
  "Panik Kalm Panik",
  "Epic Handshake",
  "Hide the Pain Harold",
  "Tuxedo Winnie The Pooh",
  "Ancient Aliens",
  "Roll Safe Think About It",
  "Laughing Leo",
];
