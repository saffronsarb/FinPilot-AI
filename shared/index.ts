export interface ChatReply {
  content: string;
  intent: string;
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  emoji: string;
}

export interface Pattern {
  title: string;
  description: string;
  emoji: string;
}

export interface IntentDef {
  name: string;
  keywords: Record<string, number>;
  threshold: number;
}

export const AI_VALID_INTENTS = [
  'afford_check',
  'spending_summary',
  'category_breakdown',
  'prediction',
  'tips',
  'motivation',
  'girl_math',
  'streak',
  'transaction_logged',
  'general',
] as const;

export type AiIntent = (typeof AI_VALID_INTENTS)[number];

export const TRANSACTION_CATEGORIES = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'healthcare',
  'education',
  'salary',
  'parents',
  'freelance',
  'investment',
  'savings',
  'miscellaneous',
] as const;


export const INTENTS: IntentDef[] = [
  {
    name: 'afford_check',
    keywords: {
      afford: 3, 'can i': 2, enough: 2, short: 2, budget: 2, broke: 2, brokeaf: 2,
      survival: 1, survive: 1, treat: 2, buy: 2, purchase: 2, splurge: 2,
    },
    threshold: 3,
  },
  {
    name: 'spending_summary',
    keywords: {
      'how much': 3, spent: 3, total: 2, summary: 3, status: 1, recap: 2, overview: 2,
      'where did': 3, 'so far': 1, balance: 1, breakdown: 2,
    },
    threshold: 3,
  },
  {
    name: 'category_breakdown',
    keywords: {
      food: 1, munchies: 2, swiggy: 3, zomato: 3, cafe: 2, party: 2, club: 2, vibes: 1,
      transport: 2, uber: 2, metro: 2, auto: 2, drip: 2, clothes: 2, shoes: 2, shop: 2,
      subs: 2, netflix: 3, spotify: 3, books: 2, hostel: 1, mess: 1, groceries: 2,
    },
    threshold: 2,
  },
  {
    name: 'prediction',
    keywords: {
      'run out': 3, 'last till': 3, 'how long': 3, 'end of month': 3, survive: 2,
      prediction: 2, predict: 2, 'zero by': 3, 'when will': 2, burn: 2, projection: 2,
    },
    threshold: 3,
  },
  {
    name: 'tips',
    keywords: {
      tips: 3, advice: 3, save: 2, saving: 2, hack: 2, hacks: 2, tip: 2, suggest: 2,
      ideas: 1, reduce: 2, cut: 2, cheaper: 2, frugal: 2, budget: 2,
    },
    threshold: 3,
  },
  {
    name: 'motivation',
    keywords: {
      hype: 3, motivate: 3, mood: 2, feeling: 1, sad: 2, depress: 2, anxious: 2,
      stress: 2, 'am i': 1, doing: 1, okay: 1, 'going great': 2, 'i did it': 2,
      proud: 2, encourage: 3, 'lock in': 2, vibes: 2,
    },
    threshold: 3,
  },
  {
    name: 'girl_math',
    keywords: {
      'girl math': 4, 'boy math': 4, justify: 3, worth: 2, 'per day': 3, 'cost per': 3,
      'how much per': 4, rationalize: 3, convince: 3, treat: 1,
    },
    threshold: 4,
  },
  {
    name: 'streak',
    keywords: {
      streak: 3, day: 1, days: 1, record: 2, 'no spend': 4, 'no-spend': 4, 'days left': 2,
    },
    threshold: 3,
  },
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['food', 'mess', 'groceries', 'hostel', 'meals', 'tiffin', 'chai', 'breakfast', 'lunch', 'dinner', 'munchies', 'snack', 'snacks', 'cafe', 'coffee', 'starbucks', 'zomato', 'swiggy', 'restaurant', 'boba'],
  transport: ['uber', 'ola', 'auto', 'metro', 'bus', 'train', 'petrol', 'fuel', 'rapido', 'commute', 'transport'],
  shopping: ['drip', 'clothes', 'shoes', 'shopping', 'mall', 'fashion', 'makeup', 'skincare', 'zara', 'h&m'],
  entertainment: ['vibes', 'club', 'clubs', 'party', 'parties', 'bar', 'movie', 'movies', 'concert', 'outing', 'hangout', 'entertainment'],
  bills: ['subs', 'subscription', 'netflix', 'spotify', 'prime', 'disney', 'hotstar', 'youtube', 'apple', 'icloud', 'gym', 'bills'],
  education: ['books', 'notes', 'stationery', 'printing', 'project', 'society', 'fest', 'course', 'tuition', 'education'],
};

export function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\w\s\u20B9]/g, ' ').split(/\s+/).filter(Boolean);
}

export function detectIntent(message: string): { intent: string | null; score: number } {
  const tokens = new Set(tokenize(message));
  const lower = message.toLowerCase();
  let best = { intent: null as string | null, score: 0 };
  for (const def of INTENTS) {
    let score = 0;
    for (const [kw, weight] of Object.entries(def.keywords)) {
      if (tokens.has(kw) || lower.includes(kw)) score += weight;
    }
    if (score > best.score && score >= def.threshold) {
      best = { intent: def.name, score };
    }
  }
  return best;
}

export function detectCategory(message: string): string | null {
  const lower = message.toLowerCase();
  let best = { cat: null as string | null, hits: 0 };
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const w of words) if (lower.includes(w)) hits++;
    if (hits > best.hits) best = { cat, hits };
  }
  return best.cat;
}

export function extractAmount(message: string): number | null {
  const m = message.match(/(?:\u20B9|rs\.?|inr|\$|€|£|usd)?\s*(\d+(?:[,]\d+)*(?:\.\d+)?)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
