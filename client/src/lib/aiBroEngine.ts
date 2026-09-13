import { financeEngine } from './financeEngine';
import { streakEngine } from './streakEngine';
import {
  ChatReply, Insight, Pattern,
  detectIntent, detectCategory, extractAmount
} from '@finpilot/shared';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(n: number, currency: string): string {
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  return `${currency}${Math.round(n).toLocaleString(locale)}`;
}

export const aiBroEngine = {
  generateReply(message: string, userId: number, userVibe: 'toast' | 'roast' = 'toast'): ChatReply {
    const list = financeEngine.getTransactionsForCycle(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const allowance = user.monthlyAllowance || 0;
    const currency = user.currency || '₹';
    const spent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const remaining = allowance - spent;

    // Group expenses by category
    const byCategoryMap: Record<string, { total: number; count: number; emoji: string }> = {};
    expenses.forEach((e) => {
      const catVal = e.category;
      const emoji = e.emoji || financeEngine.getCategoryEmoji(catVal, userId);
      if (!byCategoryMap[catVal]) {
        byCategoryMap[catVal] = { total: 0, count: 0, emoji };
      }
      byCategoryMap[catVal].total += e.amount;
      byCategoryMap[catVal].count += 1;
    });

    const byCategory = Object.entries(byCategoryMap).map(([category, info]) => ({
      category,
      total: info.total,
      count: info.count,
      emoji: info.emoji,
    })).sort((a, b) => b.total - a.total);

    const ctx = {
      userId,
      currency,
      allowance,
      spent,
      remaining,
      byCategory,
      recent: expenses.slice(0, 10),
    };

    const trimmed = message.trim();
    if (!trimmed) return { content: this.fallback(ctx, userVibe), intent: 'fallback' };

    const { intent } = detectIntent(trimmed);
    let content = '';

    switch (intent) {
      case 'spending_summary':
        content = this.handleSpendingSummary(ctx);
        break;
      case 'category_breakdown':
        content = this.handleCategoryBreakdown(ctx, trimmed);
        break;
      case 'afford_check':
        content = this.handleAfford(ctx, trimmed, userVibe);
        break;
      case 'prediction':
        content = this.handlePrediction(ctx);
        break;
      case 'tips':
        content = this.handleTips(ctx, userVibe);
        break;
      case 'motivation':
        content = this.handleMotivation(ctx, userVibe);
        break;
      case 'girl_math':
        content = this.handleGirlMath(ctx, trimmed, userVibe);
        break;
      case 'streak':
        content = this.handleStreak(userId);
        break;
      default:
        content = this.fallback(ctx, userVibe);
    }

    return { content, intent: intent || 'fallback' };
  },

  handleSpendingSummary(ctx: any): string {
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
  },

  handleCategoryBreakdown(ctx: any, message: string): string {
    const cat = detectCategory(message);
    if (!cat) return this.handleSpendingSummary(ctx);
    const found = ctx.byCategory.find((c: any) => c.category.toLowerCase() === cat.toLowerCase());
    if (!found) return pick([
      `No ${cat} spends this month bestie, slay ✨`,
      `You haven't spent on ${cat} yet this month. Manifesting it or staying strong?? 💅`,
    ]);
    return pick([
      `On ${found.category}: ${fmt(found.total, ctx.currency)} across ${found.count} txns. ${found.emoji} Main character energy honestly.`,
      `You've dropped ${fmt(found.total, ctx.currency)} on ${found.category} (${found.count} times). ${found.emoji} Let's keep tabs 🫣`,
      `${found.category.charAt(0).toUpperCase() + found.category.slice(1)} cost you ${fmt(found.total, ctx.currency)} this month, bestie. ${found.emoji}`,
    ]);
  },

  handleAfford(ctx: any, message: string, vibe: string): string {
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
  },

  handlePrediction(ctx: any): string {
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
  },

  handleTips(ctx: any, vibe: string): string {
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
  },

  handleMotivation(ctx: any, vibe: string): string {
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
  },

  handleGirlMath(ctx: any, message: string, vibe: string): string {
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
  },

  handleStreak(userId?: number): string {
    if (!userId) {
      return pick([
        `Build a no-spend streak bestie 🔥 even 2 days/week compounds.`,
        `Try a 7-day no-spend challenge. Quiet luxury unlocked 🤫`,
        `Streaks = dopamine. Day 1 starts now, go 🧊`,
      ]);
    }
    const streakState = streakEngine.getStreak(userId);
    if (streakState.currentStreak === 0) {
      return `You don't have an active streak yet bestie 🧊 Open FinPilot AI daily or log a transaction to start your streak!`;
    }
    return `You're currently on a 🔥 ${streakState.currentStreak}-day active streak! Your all-time record is ${streakState.longestStreak} days. Keep it rolling! ✨`;
  },

  fallback(_ctx: any, vibe: string): string {
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
  },

  getPersonalizedInsights(userId: number): Insight[] {
    const list = financeEngine.getTransactionsForCycle(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    if (expenses.length < 3) return [];

    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const currency = user.currency || '₹';

    const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const insights: Insight[] = [];

    // Biggest spending category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      const [topCat, topVal] = sortedCategories[0];
      const pct = Math.round((topVal / totalSpent) * 100);
      insights.push({
        type: 'warning',
        title: `Category Heavyweight: ${topCat.toUpperCase()}`,
        description: `You've dropped ${fmt(topVal, currency)} here, which is ${pct}% of your total spending.`,
        emoji: financeEngine.getCategoryEmoji(topCat, userId),
      });
    }

    // Top merchants
    const merchantTotals: Record<string, { total: number; count: number }> = {};
    expenses.forEach((e) => {
      const title = e.title.trim().toLowerCase();
      if (!merchantTotals[title]) {
        merchantTotals[title] = { total: 0, count: 0 };
      }
      merchantTotals[title].total += e.amount;
      merchantTotals[title].count += 1;
    });
    const sortedMerchants = Object.entries(merchantTotals).sort((a, b) => b[1].total - a[1].total);
    if (sortedMerchants.length > 0 && sortedMerchants[0][1].count >= 2) {
      const [name, info] = sortedMerchants[0];
      insights.push({
        type: 'info',
        title: `Top Merchant: ${name.charAt(0).toUpperCase() + name.slice(1)}`,
        description: `You spent ${fmt(info.total, currency)} here across ${info.count} transactions.`,
        emoji: '🏪',
      });
    }

    // Average daily spending
    const daysWithSpend = new Set(expenses.map((e) => e.date)).size;
    if (daysWithSpend > 1) {
      const dailyAvg = totalSpent / daysWithSpend;
      insights.push({
        type: 'info',
        title: 'Average Daily Spend',
        description: `On days you spend, you average about ${fmt(dailyAvg, currency)} per day.`,
        emoji: '💸',
      });
    }

    return insights;
  },

  getSpendingPatterns(userId: number): Pattern[] {
    const list = financeEngine.getTransactions(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    if (expenses.length < 3) return [];

    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const currency = user.currency || '₹';

    const patterns: Pattern[] = [];

    // Weekend overspending detection
    const weekendExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    const weekdayExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    });

    const weekendDays = new Set(weekendExpenses.map((e) => e.date)).size;
    const weekdayDays = new Set(weekdayExpenses.map((e) => e.date)).size;

    if (weekendDays >= 1 && weekdayDays >= 2) {
      const weekendTotal = weekendExpenses.reduce((acc, e) => acc + e.amount, 0);
      const weekdayTotal = weekdayExpenses.reduce((acc, e) => acc + e.amount, 0);

      const weekendAvg = weekendTotal / weekendDays;
      const weekdayAvg = weekdayTotal / weekdayDays;

      if (weekendAvg > weekdayAvg * 1.3) {
        patterns.push({
          title: 'Weekend Spend Spike 🍹',
          description: `You average ${fmt(weekendAvg, currency)} on weekends compared to ${fmt(weekdayAvg, currency)} on weekdays.`,
          emoji: '🎉',
        });
      }
    }

    // Category concentration (accounts for > 40%)
    const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val / totalSpent > 0.4) {
        patterns.push({
          title: `Category Concentration: ${cat.toUpperCase()}`,
          description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} accounts for ${Math.round((val / totalSpent) * 100)}% of your monthly outflows.`,
          emoji: financeEngine.getCategoryEmoji(cat, userId),
        });
      }
    });

    // Frequent Purchases
    const titleCounts: Record<string, number> = {};
    expenses.forEach((e) => {
      const title = e.title.trim().toLowerCase();
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    });
    Object.entries(titleCounts).forEach(([title, count]) => {
      if (count > 3) {
        patterns.push({
          title: `Frequent Purchase: ${title.charAt(0).toUpperCase() + title.slice(1)}`,
          description: `You bought this ${count} times this month alone.`,
          emoji: '🔄',
        });
      }
    });

    // Spending Spikes
    const avgTxn = totalSpent / expenses.length;
    expenses.forEach((e) => {
      if (e.amount > avgTxn * 3) {
        patterns.push({
          title: `Spending Spike`,
          description: `Transaction "${e.title}" of ${fmt(e.amount, currency)} is more than 3x your average transaction of ${fmt(avgTxn, currency)}.`,
          emoji: '⚡',
        });
      }
    });

    return patterns;
  },
};
