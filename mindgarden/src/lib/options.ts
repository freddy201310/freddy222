// Shared option lists used in onboarding, settings, and the Happy Place.

export const INTERESTS = [
  "Nature", "Reading", "Music", "Fitness", "Cooking", "Art", "Writing", "Gaming", "Travel", "Learning",
  "Meditation", "Gardening", "Animals", "Tech", "Film", "Faith & spirituality", "Community", "Career growth",
];

export const VALUES = [
  "Kindness", "Growth", "Family", "Freedom", "Creativity", "Health", "Honesty", "Adventure", "Balance",
  "Achievement", "Connection", "Peace", "Courage", "Curiosity", "Service",
];

export const HELPERS = [
  "Going for a walk", "Listening to music", "Talking to a friend", "Journaling", "Exercise", "Time in nature",
  "Deep breathing", "A good nap", "Cooking", "Creative projects", "Tidying up", "Time with pets", "Reading",
];

export const STRESSORS = [
  "Work deadlines", "School", "Money", "Relationships", "Health worries", "Too much on my plate",
  "Uncertainty", "Social situations", "Poor sleep", "Comparing myself to others",
];

export const TONES = [
  { id: "warm", label: "Warm & gentle", desc: "Supportive, kind, lots of encouragement" },
  { id: "direct", label: "Direct & practical", desc: "Clear, honest, focused on next steps" },
  { id: "playful", label: "Light & playful", desc: "Upbeat, a little humor, keeps things light" },
  { id: "calm", label: "Calm & grounding", desc: "Slow, steady, quiet reassurance" },
];

export const SCENES = [
  { id: "garden", label: "Garden", icon: "🌷" },
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "forest", label: "Forest", icon: "🌲" },
  { id: "cabin", label: "Cozy cabin", icon: "🛖" },
  { id: "mountain", label: "Mountain retreat", icon: "🏔️" },
  { id: "fantasy", label: "Fantasy realm", icon: "🔮" },
] as const;

export const PALETTES = [
  { id: "dawn", label: "Sunrise" },
  { id: "day", label: "Bright day" },
  { id: "dusk", label: "Golden dusk" },
  { id: "night", label: "Starry night" },
  { id: "mist", label: "Soft mist" },
  { id: "aurora", label: "Aurora" },
] as const;

export const WEATHERS = [
  { id: "clear", label: "Clear", icon: "☀️" },
  { id: "breeze", label: "Breeze", icon: "🍃" },
  { id: "rain", label: "Gentle rain", icon: "🌧️" },
  { id: "snow", label: "Snowfall", icon: "❄️" },
  { id: "fireflies", label: "Fireflies", icon: "✨" },
] as const;

export const SOUNDS = [
  { id: "none", label: "Silence" },
  { id: "rain", label: "Rain" },
  { id: "waves", label: "Ocean waves" },
  { id: "wind", label: "Wind in trees" },
  { id: "brook", label: "Babbling brook" },
  { id: "fire", label: "Crackling fire" },
] as const;

export const MUSIC = [
  { id: "none", label: "No music" },
  { id: "drone", label: "Warm pads" },
  { id: "chimes", label: "Wind chimes" },
] as const;

export const PETS = [
  { id: "none", label: "None", icon: "" },
  { id: "cat", label: "Cat", icon: "🐈" },
  { id: "dog", label: "Dog", icon: "🐕" },
  { id: "fox", label: "Fox", icon: "🦊" },
  { id: "bird", label: "Songbird", icon: "🐦" },
  { id: "bunny", label: "Bunny", icon: "🐇" },
  { id: "turtle", label: "Turtle", icon: "🐢" },
  { id: "dragon", label: "Tiny dragon", icon: "🐉" },
] as const;

export const DECORATIONS = [
  { id: "lanterns", label: "Lanterns", icon: "🏮" },
  { id: "flowers", label: "Wildflowers", icon: "🌼" },
  { id: "hammock", label: "Hammock", icon: "🪢" },
  { id: "books", label: "Book stack", icon: "📚" },
  { id: "tea", label: "Tea set", icon: "🍵" },
  { id: "crystals", label: "Crystals", icon: "💎" },
  { id: "mushrooms", label: "Mushrooms", icon: "🍄" },
  { id: "butterflies", label: "Butterflies", icon: "🦋" },
  { id: "candles", label: "Candles", icon: "🕯️" },
  { id: "plants", label: "Potted plants", icon: "🪴" },
] as const;
