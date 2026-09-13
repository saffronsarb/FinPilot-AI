import { db } from '../db/database';
import {
  ChatReply, IntentDef, INTENTS, CATEGORY_KEYWORDS,
  detectIntent, detectCategory, extractAmount
} from '@finpilot/shared';

export interface ChatContext {
  userId: number;
  currency: string;
  month: string;
  allowance: number;
  spent: number;
  remaining: number;
  byCategory: { category: string; total: number; count: number; emoji: string }[];
  recent: { id: number; amount: number; category: string; note: string | null; emoji: string; created_at: string }[];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(n: number, currency: string): string {
  return `${currency}${Math.round(n).toLocaleString('en-IN')}`;
}

function getContext(userId: number): ChatContext {
  const month = new Date().toISOString().slice(0, 7);
  const user = db
    .prepare('SELECT monthly_allowance, currency FROM users WHERE id = ?')
    .get(userId) as { monthly_allowance: number; currency: string } | undefined;
  const allowance = user?.monthly_allowance || 0;
  const currency = user?.currency || '₹';

  const total = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?')
    .get(userId, month) as { total: number };

  const byCategory = db
    .prepare(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count, MAX(emoji) AS emoji
       FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       GROUP BY category ORDER BY total DESC`
    )
    .all(userId, month) as { category: string; total: number; count: number; emoji: string }[];

  const recent = db
    .prepare(
      `SELECT id, amount, category, note, emoji, created_at
       FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       ORDER BY created_at DESC LIMIT 10`
    )
    .all(userId, month) as { id: number; amount: number; category: string; note: string | null; emoji: string; created_at: string }[];

  return {
    userId,
    currency,
    month,
    allowance,
    spent: total.total,
    remaining: allowance - total.total,
    byCategory,
    recent,
  };
}

function handleSpendingSummary(ctx: ChatContext): string {
  if (ctx.allowance === 0) {
    return pick([
      `Bestie, you've dropped ${fmt(ctx.spent, ctx.currency)} this month but you haven't set your allowance yet. Set it in settings so I can keep you in check 💅`,
    ]);
  }
  const pct = Math.round((ctx.spent / ctx.allowance) * 100);
  if (pct < 25) return pick([`You're only at ${pct}% of your allowance bestie. This is your savings era ✨ keep going fr.`]);
  if (pct < 50) return pick([`Halfway-ish, you've spent ${fmt(ctx.spent, ctx.currency)} (${pct}%). Pace yourself bestie, no cap 📈`]);
  if (pct < 75) return pick([`Babe 👀 you've burned ${pct}% (${fmt(ctx.spent, ctx.currency)}). Vibey but 🚨 chill a little.`]);
  if (pct < 95) return pick([`RED ALERT 🚨 ${pct}% gone. ${fmt(ctx.remaining, ctx.currency)} left. Lock in bestie.`]);
  return pick([`BFFR 💀 you've spent ${fmt(ctx.spent, ctx.currency)} of ${fmt(ctx.allowance, ctx.currency)}. We're basically on our last hope.`]);
}

function handleCategoryBreakdown(ctx: ChatContext, message: string): string {
  const cat = detectCategory(message);
  if (!cat) return handleSpendingSummary(ctx);
  const found = ctx.byCategory.find((c) => c.category === cat);
  if (!found) return pick([
    `No ${cat} spends this month bestie, slay ✨`,
    `You haven't spent on ${cat} yet this month. Manifesting it or staying strong?? 💅`,
  ]);
  return pick([
    `On ${cat}: ${fmt(found.total, ctx.currency)} across ${found.count} txns. ${found.emoji} Main character energy honestly.`,
    `You've dropped ${fmt(found.total, ctx.currency)} on ${cat} (${found.count} times). ${found.emoji} Let's keep tabs 🫣`,
    `${cat.charAt(0).toUpperCase() + cat.slice(1)} cost you ${fmt(found.total, ctx.currency)} this month, bestie. ${found.emoji}`,
  ]);
}

function handleAfford(ctx: ChatContext, message: string, vibe: string): string {
  const amount = extractAmount(message);
  if (amount === null) {
    return `Tell me the price bestie — like "can I afford ₹500?" and I'll do the math 💅`;
  }
  if (ctx.allowance === 0) {
    return `Set your allowance in settings first and I'll be the bestie that maths it out 🧮`;
  }

  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const dailyBudget = Math.max(0, ctx.remaining / remainingDays);

  if (amount <= ctx.remaining && amount <= dailyBudget * 2) {
    const verdicts = vibe === 'roast' ? [
      `Sure 😭 go for it. ${fmt(amount, ctx.currency)} is fine, you have ${fmt(ctx.remaining, ctx.currency)} left. Treat yourself queen 👑`,
      `You CAN secure the bag. ${fmt(amount, ctx.currency)} out of remaining ${fmt(ctx.remaining, ctx.currency)}. Go off bestie ✨`,
    ] : [
      `Yes bestie ✨ ${fmt(amount, ctx.currency)} is within budget. Manifesting! 💅`,
      `Fr you can afford it. ${fmt(amount, ctx.currency)} is chill given your remaining ${fmt(ctx.remaining, ctx.currency)} 💸`,
      `Girl math says yes 🧮 ${fmt(amount, ctx.currency)} fits.`,
    ];
    return pick(verdicts);
  }
  if (amount <= ctx.remaining) {
    return pick(vibe === 'roast' ? [
      `You can technically afford it (${fmt(ctx.remaining, ctx.currency)} left) but your daily budget is only ${fmt(dailyBudget, ctx.currency)}. Are you trying to starve 💀`,
      `BFFR you have ₹${ctx.remaining} but you're hitting ₹0 by month-end at this rate 🛑`,
    ] : [
      `Hmm, technically yes — ${fmt(amount, ctx.currency)} fits in your remaining ${fmt(ctx.remaining, ctx.currency)} — but your daily budget is just ${fmt(dailyBudget, ctx.currency)}. Cautious yes ⚠️`,
      `Borderline bestie 🫣 Daily budget is ${fmt(dailyBudget, ctx.currency)}. Take it slow.`,
    ]);
  }
  return pick(vibe === 'roast' ? [
    `LMAOOO 💀 you're ${fmt(amount - ctx.remaining, ctx.currency)} short. Absolute delusion. Skip it or compute later 💅`,
    `Girl NO 😭 ${fmt(amount, ctx.currency)} when you only have ${fmt(ctx.remaining, ctx.currency)}? Skibidi toilet paper math 🧻`,
    `Hard no bestie. You're ${fmt(amount - ctx.remaining, ctx.currency)} short. Keep your coins 🪙`,
  ] : [
    `Bestie, hard pass 💔 you only have ${fmt(ctx.remaining, ctx.currency)} and that's ${fmt(amount - ctx.remaining, ctx.currency)} short. Save it for next month 🫶`,
    `Not happening 💫 you need ${fmt(amount - ctx.remaining, ctx.currency)} more. C'est la vie.`,
  ]);
}

function handlePrediction(ctx: ChatContext): string {
  if (ctx.allowance === 0 || ctx.spent === 0) {
    return `Start logging some spends bestie, then I'll vibe-check your burn rate ✨`;
  }
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (dayOfMonth < 2) {
    const dailyBurn = ctx.spent;
    const projected = dailyBurn * daysInMonth;
    return `Kinda early to predict but at this pace you'll spend ${fmt(projected, ctx.currency)} by month-end. Stay woke 👀`;
  }
  const dailyBurn = ctx.spent / dayOfMonth;
  if (ctx.remaining <= 0) {
    return `You're already over budget bestie 💀 consider going into savings mode immediately.`;
  }
  const daysLeft = Math.floor(ctx.remaining / Math.max(1, dailyBurn));
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysLeft);
  return pick([
    `At this burn rate (${fmt(dailyBurn, ctx.currency)}/day), you're hitting ₹0 by ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Lock in 🛑`,
    `Bestie math: ${fmt(dailyBurn, ctx.currency)}/day × the rest of the month = bad vibes. Hit zero around ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} unless we chill 📉`,
    `Your bread goes bye-bye around ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} 🪙 Time to vibe slower.`,
  ]);
}

function handleTips(ctx: ChatContext, vibe: string): string {
  const top = ctx.byCategory[0];
  const tips = vibe === 'roast' ? [
    `Cancel something you don't use fr 📺 subscriptions add up silently.`,
    `Cook once a week, save your coins on munchies 🍳`,
    `Cap Uber, walk or take the metro when possible 🛺 no cap.`,
    `Set a "no spend day" challenge 2x a week 🧊`,
    `Girl math is great but real math is better 🧮 track before you tap.`,
  ] : [
    `Try the 50/30/20 rule — needs, wants, savings. Vibes 💅`,
    `Cap your top category this week and revisit Sunday ✨`,
    `Round-up savings: every time you spend ${fmt(50, ctx.currency)}, auto-put the spare change away 🐷`,
    `Cancel one sub you forgot about. Future you says thanks 🫶`,
    `Meal-prep once a week, future-you locks in 🔐`,
  ];
  const intro = top ? `You spent the most on ${top.category} (${fmt(top.total, ctx.currency)}). Maybe trim there ✂️. ` : `Vibes `;
  return intro + pick(tips);
}

function handleMotivation(ctx: ChatContext, vibe: string): string {
  const pct = ctx.allowance > 0 ? (ctx.spent / ctx.allowance) * 100 : 0;
  if (pct < 30) return pick([
    `You're absolutely in your savings era ✨ keep going bestie, no cap 💅`,
    `Main character financial arc 🎬 you're locked in.`,
    `W vibes only. Keep this energy 🦋`,
  ]);
  if (pct < 70) return pick([
    `Honestly? You're doing fine bestie 👏 just stay consistent.`,
    `Golden retriever energy rn — keep going you got this 🐶💛`,
  ]);
  return vibe === 'roast'
    ? pick([
        `Babe we're in mid-spend territory 🫠 it's not too late to back off Swiggy.`,
        `Delulu is not the solulu here. Lock in for the rest of the month 💅`,
      ])
    : pick([
        `Don't stress bestie, awareness is half the battle 🤍 you'll know better next month.`,
        `It's okay, every month is a vibe check. Reset and try again 💖`,
      ]);
}

function handleGirlMath(ctx: ChatContext, message: string, vibe: string): string {
  const amount = extractAmount(message);
  if (!amount) {
    return pick([
      `Hit me with a price bestie and I'll do the girl math ✨ e.g. "girl math a ₹2000 bag"`,
      `Drop the amount like "justify ₹1500" and watch me cook 🧮💅`,
    ]);
  }
  const cat = detectCategory(message) || ctx.byCategory[0]?.category || 'thing';
  const usesMap: Record<string, number> = {
    outfit: 30, dress: 30, shoes: 50, bag: 100, watch: 365, sub: 365, subscription: 365,
    snack: 7, coffee: 30, munchies: 7, cafe: 15, movie: 4,
  };
  const uses = usesMap[cat] ?? 30;
  const perDay = amount / uses;
  return vibe === 'roast'
    ? `Girl math-ing it: ${fmt(amount, ctx.currency)} ÷ ${uses} uses = ${fmt(perDay, ctx.currency)}/day. Still cap 🧢 bestie.`
    : `Girl math activated 🧮 ${fmt(amount, ctx.currency)} ÷ ${uses} uses = ${fmt(perDay, ctx.currency)} per day. Basically free, treat yourself ✨`;
}

function handleStreak(): string {
  return pick([
    `Build a no-spend streak bestie 🔥 even 2 days/week compounds.`,
    `Try a 7-day no-spend challenge. Quiet luxury unlocked 🤫`,
    `Streaks = dopamine. Day 1 starts now, go 🧊`,
  ]);
}

function fallback(ctx: ChatContext, vibe: string): string {
  return vibe === 'roast'
    ? pick([
        `No thoughts just vibes 💀 try asking about spending, "afford ₹X", "tips", or "burn rate" bestie.`,
        `404 brain cells, ask me about your spends fr 🧠`,
        `I'm Bro, your money's bestie. Ask: "where did my money go" / "can I afford ₹500" / "give me tips" 💅`,
      ])
    : pick([
        `I can help with: spending summary, category breakdowns, "can I afford X", and savings tips ✨ try one!`,
        `Hey bestie 💖 ask: "how much have I spent", "can I afford ₹500", or "give me tips"`,
        `Energy matched, but no thoughts just empty vibes 🫠 try: "summary" or "tips"`,
      ]);
}

export function chat(message: string, userId: number): ChatReply {
  const ctx = getContext(userId);
  const user = db
    .prepare('SELECT vibe FROM users WHERE id = ?')
    .get(userId) as { vibe: string } | undefined;
  const vibe = user?.vibe || 'toast';

  const trimmed = message.trim();
  if (!trimmed) return { content: fallback(ctx, vibe), intent: 'fallback' };

  const { intent } = detectIntent(trimmed);
  let content: string;
  switch (intent) {
    case 'spending_summary':
      content = handleSpendingSummary(ctx);
      break;
    case 'category_breakdown':
      content = handleCategoryBreakdown(ctx, trimmed);
      break;
    case 'afford_check':
      content = handleAfford(ctx, trimmed, vibe);
      break;
    case 'prediction':
      content = handlePrediction(ctx);
      break;
    case 'tips':
      content = handleTips(ctx, vibe);
      break;
    case 'motivation':
      content = handleMotivation(ctx, vibe);
      break;
    case 'girl_math':
      content = handleGirlMath(ctx, trimmed, vibe);
      break;
    case 'streak':
      content = handleStreak();
      break;
    default:
      content = fallback(ctx, vibe);
  }
  return { content, intent: intent || 'fallback' };
}

export const QUICK_PROMPTS = [
  'How much have I spent this month? 💸',
  'Where is my money going? 📊',
  'Can I afford ₹500? 🤔',
  'When will I run out of money? 🔮',
  'Bestie give me 3 saving tips ✨',
  'Hyp me up bestie 💖',
  'Girl math a ₹2000 dress 👗',
  'Am I doing okay this month? 🥺',
];
