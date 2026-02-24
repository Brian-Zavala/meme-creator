// constants/captionBank.js
// Caption pairs keyed by topic. TOKEN_TOPIC_MAP maps raw tokens to topic keys.

export const CAPTION_BANK = {
  computer: [
    { top: "Me trying to fix one bug", bottom: "Creates 3 more" },
    { top: "When the code works", bottom: "But you don't know why" },
    { top: "My brain at 2am", bottom: "vs my brain during the standup" },
  ],
  animal: [
    { top: "My dog when I open a bag of chips", bottom: "vs any other time" },
    { top: "The cat at 3am", bottom: "The cat at 3:01am" },
    { top: "When they said good boy", bottom: "The good boy" },
  ],
  couple: [
    { top: "Me explaining why I'm right", bottom: "Me five minutes later" },
    { top: "Us in every argument", bottom: "Neither of us can remember how it started" },
    { top: "When they said they're not mad", bottom: "They're mad" },
  ],
  food: [
    { top: "Me ordering a salad", bottom: "Me adding everything else to the salad" },
    { top: "The last slice of pizza", bottom: "Everyone in the room" },
    { top: "My diet starts Monday", bottom: "It's Tuesday" },
  ],
  work: [
    { top: "My to-do list on Friday", bottom: "My to-do list on Monday" },
    { top: "Manager: this should only take 5 minutes", bottom: "The task" },
    { top: "When the meeting could have been an email", bottom: "The meeting" },
  ],
  sleep: [
    { top: "My alarm at 7am", bottom: "Me at 7am" },
    { top: "Going to bed early tonight", bottom: "3am" },
    { top: "Falling asleep during the movie", bottom: "Waking up for the credits" },
  ],
  money: [
    { top: "My bank account", bottom: "My spending habits" },
    { top: "Payday", bottom: "Every bill I forgot about" },
    { top: "Me window shopping", bottom: "My wallet leaving the chat" },
  ],
  school: [
    { top: "The assignment due at midnight", bottom: "Me at 11:58pm" },
    { top: "Studying the wrong chapters", bottom: "The exam" },
    { top: "My notes", bottom: "What was actually on the test" },
  ],
  success: [
    { top: "When the plan actually worked", bottom: "The plan" },
    { top: "Me after one productive hour", bottom: "Acting like I deserve a week off" },
    { top: "When you said it couldn't be done", bottom: "It's done" },
  ],
  fail: [
    { top: "What I thought would happen", bottom: "What actually happened" },
    { top: "The confidence before", bottom: "The humility after" },
    { top: "My plan", bottom: "Reality" },
  ],
  confused: [
    { top: "Me reading the instructions", bottom: "Also me" },
    { top: "What they said", bottom: "What I heard" },
    { top: "The directions", bottom: "Where I ended up" },
  ],
  excited: [
    { top: "Me when Friday hits", bottom: "Me on Sunday night" },
    { top: "The hype before", bottom: "The experience during" },
    { top: "When you finally get what you wanted", bottom: "What you actually wanted" },
  ],
  frustrated: [
    { top: "Me trying to be patient", bottom: "Two minutes in" },
    { top: "The thing that should be simple", bottom: "Why it's not simple" },
    { top: "My last nerve", bottom: "Today" },
  ],
  surprised: [
    { top: "Nobody:", bottom: "Me, suddenly:" },
    { top: "What I expected", bottom: "What showed up" },
    { top: "When they actually followed through", bottom: "Shock" },
  ],
  gym: [
    { top: "Day 1 at the gym", bottom: "Day 2 at the gym" },
    { top: "The gym in January", bottom: "The gym in February" },
    { top: "What I look like in my head", bottom: "What I actually look like" },
  ],
  weather: [
    { top: "Me checking the forecast", bottom: "The weather ignoring it" },
    { top: "Going out without an umbrella", bottom: "Five minutes later" },
    { top: "Summer plans", bottom: "Summer weather" },
  ],
  coffee: [
    { top: "Me before coffee", bottom: "Me after coffee" },
    { top: "My first thought every morning", bottom: "Coffee" },
    { top: "Functioning like an adult", bottom: "Requires coffee" },
  ],
  phone: [
    { top: "My screen time report", bottom: "Me pretending I didn't see it" },
    { top: "Putting the phone down for the night", bottom: "One more scroll" },
    { top: "Me scrolling at midnight", bottom: "Why I'm tired" },
  ],
  friend: [
    { top: "Us at the restaurant", bottom: "Us after looking at the menu prices" },
    { top: "Making plans", bottom: "Cancelling plans" },
    { top: "Us in public", bottom: "Us in private" },
  ],
  baby: [
    { top: "When the baby is sleeping", bottom: "The second you try to put them down" },
    { top: "Every adult in the room", bottom: "The baby" },
    { top: "Them at 6am", bottom: "Me at 6am" },
  ],
  choice: [
    { top: "The thing I should do", bottom: "The thing I'm going to do" },
    { top: "Option A", bottom: "Also option A" },
    { top: "What I said I'd pick", bottom: "What I actually picked" },
  ],
  nature: [
    { top: "Me vs the outdoors", bottom: "The outdoors is winning" },
    { top: "A peaceful hike", bottom: "Me on a peaceful hike" },
    { top: "Nature at its finest", bottom: "My hay fever" },
  ],
};

// Maps individual tokens (lowercase) to topic keys.
// Designed to match common Unsplash alt_description, Pexels alt, Giphy title, and Imgflip template name tokens.
export const TOKEN_TOPIC_MAP = {
  computer: [
    "computer", "laptop", "screen", "keyboard", "code", "coding", "programmer",
    "bug", "software", "developer", "programming", "typing", "monitor", "desktop",
    "hacker", "terminal", "server", "debug", "deploy", "javascript", "python",
    "error", "crash", "compile", "tech", "technology",
  ],
  animal: [
    "dog", "cat", "animal", "pet", "puppy", "kitten", "bird", "fish", "rabbit",
    "hamster", "parrot", "turtle", "snake", "lizard", "frog", "bear", "wolf",
    "fox", "deer", "horse", "cow", "pig", "chicken", "duck", "owl", "penguin",
    "lion", "tiger", "elephant", "monkey", "gorilla", "panda", "koala", "sloth",
    "golden", "retriever", "labrador", "bulldog", "poodle", "husky", "corgi",
  ],
  couple: [
    "couple", "arguing", "argument", "fighting", "relationship", "boyfriend",
    "girlfriend", "husband", "wife", "partner", "love", "wedding", "marriage",
    "date", "dating", "romance", "romantic", "kiss", "hug", "together",
  ],
  food: [
    "food", "eating", "meal", "pizza", "burger", "sandwich", "salad", "cake",
    "dessert", "chocolate", "coffee", "drink", "restaurant", "cooking", "chef",
    "recipe", "lunch", "dinner", "breakfast", "snack", "hungry", "delicious",
    "pasta", "sushi", "taco", "donut", "ice", "cream", "fries", "soup",
  ],
  work: [
    "office", "work", "working", "business", "meeting", "boss", "employee",
    "job", "career", "desk", "corporate", "professional", "manager", "team",
    "deadline", "presentation", "email", "zoom", "remote", "salary",
  ],
  sleep: [
    "sleep", "sleeping", "bed", "tired", "nap", "yawn", "dream", "pillow",
    "blanket", "alarm", "morning", "night", "exhausted", "drowsy", "rest",
    "couch", "sofa", "dozing",
  ],
  money: [
    "money", "cash", "wallet", "bank", "dollar", "coin", "rich", "broke",
    "shopping", "purchase", "spending", "budget", "savings", "credit", "debt",
    "expensive", "cheap", "price", "deal", "sale",
  ],
  school: [
    "student", "school", "study", "studying", "exam", "test", "homework",
    "class", "teacher", "professor", "university", "college", "book", "books",
    "notebook", "library", "grade", "assignment", "lecture", "graduation",
  ],
  success: [
    "success", "win", "winner", "victory", "celebrate", "celebration", "trophy",
    "achievement", "goal", "champion", "proud", "happy", "smiling", "thumbs",
    "fist", "pump", "accomplished", "done", "finished",
  ],
  fail: [
    "fail", "failure", "mistake", "wrong", "broken", "oops", "disaster",
    "crash", "fall", "falling", "accident", "mess", "crying", "sad",
    "disappointed", "regret", "facepalm",
  ],
  confused: [
    "confused", "confusing", "question", "thinking", "thought", "pondering",
    "puzzled", "scratch", "head", "wondering", "unsure", "lost",
    "blank", "stare", "staring",
  ],
  excited: [
    "excited", "excitement", "happy", "happiness", "joy", "jumping",
    "celebrating", "party", "fun", "smile", "laugh", "laughing", "cheering",
    "clapping", "wow", "amazing", "incredible",
  ],
  frustrated: [
    "frustrated", "frustration", "angry", "anger", "annoyed", "mad", "rage",
    "upset", "stress", "stressed", "screaming", "yelling", "facepalm",
    "sighing", "sigh", "irritated",
  ],
  surprised: [
    "surprised", "surprise", "shocked", "shock", "gasp", "wide",
    "unexpected", "pikachu", "disbelief",
  ],
  gym: [
    "gym", "fitness", "workout", "exercise", "lifting", "weights", "running",
    "training", "muscle", "fit", "strong", "cardio", "yoga", "pushup",
    "squat", "bench", "athlete", "sport", "sports",
  ],
  weather: [
    "rain", "raining", "snow", "snowing", "storm", "weather", "sun", "sunny",
    "cloud", "cloudy", "wind", "windy", "umbrella", "thunder", "lightning",
    "fog", "foggy", "cold", "hot", "humid",
  ],
  coffee: [
    "coffee", "espresso", "latte", "cappuccino", "cafe", "barista", "mug",
    "cup", "tea", "brew", "caffeine",
  ],
  phone: [
    "phone", "smartphone", "scrolling", "social", "media", "instagram",
    "tiktok", "twitter", "texting", "notification", "app", "selfie",
    "internet", "online",
  ],
  friend: [
    "friends", "friend", "group", "gang", "squad", "crew", "together", "hanging",
    "laughing", "selfie", "party", "celebration", "reunion",
  ],
  baby: [
    "baby", "infant", "toddler", "child", "kid", "children", "cute", "adorable",
    "newborn", "crawling", "crying", "laughing", "playing",
  ],
  choice: [
    "choice", "choose", "choosing", "decide", "decision", "prefer", "vs",
    "versus", "either", "both", "neither", "option", "select", "pick",
    "drake", "hotline", "bling", "buttons", "two",
  ],
  nature: [
    "nature", "forest", "tree", "trees", "mountain", "lake", "river", "ocean",
    "beach", "sunset", "sunrise", "landscape", "park", "garden", "flower",
    "flowers", "grass", "hiking", "trail", "outdoor", "outdoors", "wilderness",
  ],
};
