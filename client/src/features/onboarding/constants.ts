export const AVATARS = ['🦊', '🐹', '🐼', '🦁', '🐯', '🐨', '🦄', '🦖', '🐱', '🐶', '🐻', '🦉'];

export const CURRENCIES = [
  { symbol: '₹', name: 'Indian Rupee', code: 'INR', flag: '🇮🇳' },
  { symbol: '$', name: 'US Dollar', code: 'USD', flag: '🇺🇸' },
  { symbol: '€', name: 'Euro', code: 'EUR', flag: '🇪🇺' },
  { symbol: '£', name: 'British Pound', code: 'GBP', flag: '🇬🇧' },
  { symbol: '¥', name: 'Japanese Yen', code: 'JPY', flag: '🇯🇵' },
  { symbol: '₩', name: 'Korean Won', code: 'KRW', flag: '🇰🇷' },
];

export const CURRENCY_INCOME_PRESETS: Record<string, { label: string; value: number }[]> = {
  '₹': [
    { label: '₹2,000', value: 2000 },
    { label: '₹5,000', value: 5000 },
    { label: '₹10,000', value: 10000 },
    { label: '₹15,000+', value: 15000 },
  ],
  '$': [
    { label: '$100', value: 100 },
    { label: '$250', value: 250 },
    { label: '$500', value: 500 },
    { label: '$1,000+', value: 1000 },
  ],
  '€': [
    { label: '€100', value: 100 },
    { label: '€250', value: 250 },
    { label: '€500', value: 500 },
    { label: '€1,000+', value: 1000 },
  ],
  '£': [
    { label: '£80', value: 80 },
    { label: '£200', value: 200 },
    { label: '£400', value: 400 },
    { label: '£800+', value: 800 },
  ],
  '¥': [
    { label: '¥15,000', value: 15000 },
    { label: '¥30,000', value: 30000 },
    { label: '¥60,000', value: 60000 },
    { label: '¥120,000+', value: 120000 },
  ],
  '₩': [
    { label: '₩150,000', value: 150000 },
    { label: '₩300,000', value: 300000 },
    { label: '₩600,000', value: 600000 },
    { label: '₩1,200,000+', value: 1200000 },
  ],
};

export const CURRENCY_TARGET_PRESETS: Record<string, number[]> = {
  '₹': [5000, 10000, 25000, 50000, 100000],
  '$': [100, 250, 500, 1000, 2500],
  '€': [100, 250, 500, 1000, 2500],
  '£': [80, 200, 400, 800, 2000],
  '¥': [15000, 30000, 60000, 150000, 300000],
  '₩': [150000, 300000, 600000, 1500000, 3000000],
};

export const GOALS_PRESETS = [
  { label: 'Laptop', value: 'Laptop', emoji: '💻' },
  { label: 'Phone', value: 'Phone', emoji: '📱' },
  { label: 'Gaming Setup', value: 'Gaming Setup', emoji: '🎮' },
  { label: 'Travel', value: 'Travel', emoji: '✈️' },
  { label: 'Education', value: 'Education', emoji: '🎓' },
  { label: 'Emergency Fund', value: 'Emergency Fund', emoji: '💰' },
];

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'];

export const PERSONALITIES = [
  {
    id: 'bestie',
    emoji: '💅',
    name: 'Bestie',
    desc: 'Friendly, Gen Z, Supportive, and absolute vibe-check energy.',
  },
  {
    id: 'professional',
    emoji: '💼',
    name: 'Professional',
    desc: 'Minimal, Analytical, Direct, and focus-driven advice.',
  },
  {
    id: 'coach',
    emoji: '🚀',
    name: 'Coach',
    desc: 'Motivational, Disciplined, Goal-focused, and high-energy encouragement.',
  },
  {
    id: 'calm',
    emoji: '🧘',
    name: 'Calm',
    desc: 'Mindful, Gentle, Encouraging, and peaceful financial support.',
  },
];
