/**
 * aiContext.ts
 *
 * Builds the context snapshot sent to the LLM chat endpoint, purely from
 * data the existing engines already expose (financeEngine, savingsEngine,
 * subscriptionEngine, streakEngine). Read-only — no writes, no side effects.
 *
 * Mirrors the context shape from HANDOFF.md Section 10. Kept compact
 * (capped recent transactions, pre-aggregated categories) to control
 * prompt size/cost regardless of account age.
 */

import { financeEngine } from './financeEngine';
import { savingsEngine } from './savingsEngine';
import { subscriptionEngine } from './subscriptionEngine';
import { streakEngine } from './streakEngine';

export type AiChatContext = {
  currency: string;
  allowance: number;
  spent: number;
  remaining: number;
  byCategory: { category: string; total: number; count: number }[];
  recentTransactions: {
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  }[];
  activeGoals: { title: string; targetAmount: number; currentAmount: number }[];
  activeSubscriptionsMonthlyTotal: number;
  streak: { current: number; longest: number };
  personality: 'bestie' | 'coach' | 'professional' | 'calm';
};

export function buildAiChatContext(
  userId: number,
  allowance: number,
  currency: string,
  personality: AiChatContext['personality']
): AiChatContext {
  const summary = financeEngine.getSummary(userId, allowance, currency);

  const cycleTransactions = financeEngine.getTransactionsForCycle(userId);
  const recentTransactions = [...cycleTransactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((t) => ({
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date,
    }));

  const activeGoals = savingsEngine
    .getGoals(userId)
    .filter((g) => !g.archived && g.current_amount < g.target_amount)
    .map((g) => ({
      title: g.title,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
    }));

  const activeSubscriptionsMonthlyTotal = subscriptionEngine.getMonthlyTotal(userId);

  const streakState = streakEngine.getStreak(userId);

  return {
    currency,
    allowance: summary.allowance,
    spent: summary.spent,
    remaining: summary.remaining,
    byCategory: summary.byCategory.map((c) => ({
      category: c.category,
      total: c.total,
      count: c.count,
    })),
    recentTransactions,
    activeGoals,
    activeSubscriptionsMonthlyTotal,
    streak: {
      current: streakState.currentStreak,
      longest: streakState.longestStreak,
    },
    personality,
  };
}
