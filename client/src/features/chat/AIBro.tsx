import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, Sparkles, TrendingUp, AlertCircle, HelpCircle, ArrowRight, User as UserIcon } from 'lucide-react';
import { User, ChatMessage } from '../../lib/types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatBlock } from '../../components/ui/StatBlock';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../hooks/useToast';
import { aiBroEngine } from '../../lib/aiBroEngine';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { financeEngine } from '../../lib/financeEngine';
import { streakEngine } from '../../lib/streakEngine';
import { savingsEngine } from '../../lib/savingsEngine';
import { subscriptionEngine } from '../../lib/subscriptionEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { notificationEngine } from '../../lib/notificationEngine';
import { progressionEngine } from '../../engines/progressionEngine';
import { api } from '../../lib/api';
import { buildAiChatContext } from '../../lib/aiContext';
import { BrandMark } from '../../components/ui/BrandMark';

interface AIBroProps {
  user: User;
}

// Cycling "thinking" copy while waiting on the LLM — a static "typing..."
// label starts to feel stuck on a slow request; rotating through a few
// lines makes the same wait feel shorter and more alive.
const THINKING_MESSAGES = [
  'AI Bro is typing...',
  'Crunching your numbers...',
  'Reading your spending tea leaves...',
  'Almost got it...',
];

export function AIBro({ user }: AIBroProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [thinkingIndex, setThinkingIndex] = useState(0);
  useEffect(() => {
    if (!loading) {
      setThinkingIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingIndex((i) => (i + 1) % THINKING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

  const userId = user.id;
  const userVibe = user.vibe || 'toast';
  const currency = user.currency || '₹';

  // Local personality state — allows mid-chat switching without prop changes.
  // Separate from `userVibe` (toast/roast), which drives aiBroEngine reply tone.
  const [activePersonality, setActivePersonality] = useState(
    () => preferencesEngine.getPreferences(userId).aiBroPersonality || 'bestie'
  );

  // Load chat history from localStorage (supporting old key as fallback)
  useEffect(() => {
    const newKey = `breadbuddy_aibro_history_${userId}`;
    const oldKey = `breadbuddy_chat_history_${userId}`;
    const savedNew = localStorage.getItem(newKey);
    const savedOld = localStorage.getItem(oldKey);

    if (savedNew) {
      try {
        setMessages(JSON.parse(savedNew));
      } catch (unknown) {
        initializeWelcomeMessage();
      }
    } else if (savedOld) {
      try {
        const history = JSON.parse(savedOld);
        setMessages(history);
        localStorage.setItem(newKey, savedOld);
      } catch (unknown) {
        initializeWelcomeMessage();
      }
    } else {
      initializeWelcomeMessage();
    }
  }, [userId]);

  const initializeWelcomeMessage = () => {
    const streak = streakEngine.getStreak(userId);
    const goals = savingsEngine.getGoals(userId);
    const completedGoalsCount = goals.filter((g: any) => g.current_amount >= g.target_amount).length;
    const subsCount = subscriptionEngine.getSubscriptions(userId).filter((s: any) => s.status === 'active').length;

    let milestoneText = '';
    if (streak.currentStreak >= 3) {
      milestoneText += ` You've maintained a consistency streak of ${streak.currentStreak} days.`;
    }
    if (completedGoalsCount >= 1) {
      milestoneText += " You've successfully completed a savings goal.";
    }
    if (subsCount >= 1) {
      milestoneText += " You have also configured active subscriptions.";
    }

    const prefs = preferencesEngine.getPreferences(userId);
    const name = user.name || 'user';
    // Default (bestie) intro should sound like a friend texting, not a
    // form letter — matches the "bestie" voice used once the LLM is live,
    // instead of contradicting it with formal "I am your AI Companion" copy.
    let baseIntro = `Hey ${name}! I'm AI Bro, your money bestie. Ask me anything about your allowance, what you spent, or your savings goals — or just tell me about a purchase and I'll log it for you.`;

    if (prefs.aiBroPersonality === 'professional') {
      baseIntro = `Hello, ${name}. I am your financial analyst. You can query me regarding your monthly allowance limits, transactions, or savings goal progress metrics. Let's optimize your balance.`;
    } else if (prefs.aiBroPersonality === 'coach') {
      baseIntro = `Let's work together, ${name}. I am your financial coach. Ask me anything about your cashflow, spending habits, or goal progress.`;
    } else if (prefs.aiBroPersonality === 'calm') {
      baseIntro = `Welcome, ${name}. I am your financial companion, here to help you navigate your allowance, transactions, and savings goals peacefully.`;
    }

    const welcome: ChatMessage = {
      role: 'bro',
      content: `${baseIntro}${milestoneText}`,
      created_at: new Date().toISOString(),
    };
    setMessages([welcome]);
    localStorage.setItem(`breadbuddy_aibro_history_${userId}`, JSON.stringify([welcome]));
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const finalizeReply = (content: string, intent: string | undefined, updatedMessages: ChatMessage[]) => {
    const newMsg: ChatMessage = {
      role: 'bro',
      content,
      intent,
      created_at: new Date().toISOString(),
    };
    const finalMessages = [...updatedMessages, newMsg];
    setMessages(finalMessages);
    localStorage.setItem(`breadbuddy_aibro_history_${userId}`, JSON.stringify(finalMessages));

    notificationEngine.addNotification(userId, {
      title: 'AI Bro Insight 💡',
      message: content,
      emoji: '💡',
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Try the real LLM first — build context from the same engines the
      // rest of the app already reads, so the model reasons over the
      // user's actual data.
      const context = buildAiChatContext(
        userId,
        user.monthlyAllowance || 0,
        currency,
        activePersonality
      );
      const reply = await api.aiChatMessage({ message: text, context });

      if (reply.transaction) {
        // Reuse the exact save sequence TransactionModal.tsx already uses —
        // no new persistence logic. Keeps the dashboard's event-driven
        // refresh (finance-updated) and gamification (progressionEngine)
        // working exactly as they do for manually-logged transactions.
        const { amount, type, category, title } = reply.transaction;
        const emoji = financeEngine.getCategoryEmoji(category, userId);
        const now = new Date();
        const newTx = {
          id: Date.now(),
          amount,
          currency,
          type,
          category,
          title,
          description: '',
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          paymentMethod: 'UPI / Card',
          notes: 'Logged via AI Bro chat',
          emoji,
          created_at: now.toISOString(),
        };

        const list = financeEngine.getTransactions(userId);
        financeEngine.saveTransactions(userId, [newTx, ...list]);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('finance-updated'));
          // Triggers the existing floating-particle celebration in App.tsx
          // (already built, already styled) — previously wired up nowhere,
          // so NL-logged transactions felt flatter than the manual-entry
          // flow in TransactionModal.tsx. Free perceived-quality win, zero
          // new UI.
          window.dispatchEvent(new CustomEvent('expense-added'));
        }

        try {
          progressionEngine.processEvent({
            userId,
            type: 'log_expense',
            timestamp: now.toISOString(),
          });
        } catch (err) {
          console.error('Failed to reward progress:', err);
        }

        const verb = type === 'income' ? 'Received' : 'Logged';
        toast.success(`${emoji} ${verb} ${currency}${amount.toLocaleString('en-IN')} · ${title}`);
      }

      finalizeReply(reply.content, reply.intent, updatedMessages);
    } catch (llmErr) {
      // Any failure (offline, missing API key, malformed LLM output, etc.)
      // falls back to the existing rule-based engine — always available.
      try {
        const reply = aiBroEngine.generateReply(text, userId, userVibe);
        finalizeReply(reply.content, reply.intent, updatedMessages);
      } catch (err) {
        const errorMsg: ChatMessage = {
          role: 'bro',
          content: "Hmm, I'm having trouble thinking straight right now 😅 Give me another shot in a sec?",
          created_at: new Date().toISOString(),
        };
        setMessages([...updatedMessages, errorMsg]);
        toast.error('AI Bro is having a moment — try again in a bit');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const clearHistoryConfirm = () => {
    localStorage.removeItem(`breadbuddy_aibro_history_${userId}`);
    localStorage.removeItem(`breadbuddy_chat_history_${userId}`);
    initializeWelcomeMessage();
    toast.success('AI Bro memory cleared!');
    setIsClearConfirmOpen(false);
  };

  // Calculations for UI panels
  const list = financeEngine.getTransactionsForCycle(userId);
  const expenses = list.filter((t) => t.type === 'expense');
  const spent = expenses.reduce((acc, t) => acc + t.amount, 0);
  const allowance = user.monthlyAllowance || 0;
  const remaining = allowance - spent;
  const pct = allowance > 0 ? Math.round((spent / allowance) * 100) : 0;

  const hasEnoughData = expenses.length >= 3;
  const insights = aiBroEngine.getPersonalizedInsights(userId);
  const patterns = aiBroEngine.getSpendingPatterns(userId);

  const allItems = [...insights, ...patterns];
  const top3Insights = allItems.slice(0, 3);

  const suggestedQuestions = [
    'Where did I spend the most this month? 💸',
    'Can I afford this purchase? 🤔',
    'Help me save more money. ✨',
    'What are my spending habits? 📊',
    'Which category costs me the most? 🍕',
    'Summarize this month\'s spending. 📈',
  ];

  // Budget status evaluation
  let statusText = '';
  let statusColor = '';
  let statusEmoji = '';
  if (pct >= 90) {
    statusText = "You've exceeded your planned allowance.";
    statusColor = 'text-bb-coral border-bb-coral bg-bb-surface';
    statusEmoji = '🔴';
  } else if (pct > 60) {
    statusText = 'Watch your spending this week.';
    statusColor = 'text-bb-violet border-bb-violet bg-bb-surface';
    statusEmoji = '🟡';
  } else {
    statusText = "You're comfortably within budget.";
    statusColor = 'text-bb-lime border-bb-border bg-bb-surface';
    statusEmoji = '🟢';
  }

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner - Rebuilt to flat Card */}
      <Card accent="violet" glassy className="p-6 md:p-8 select-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-black tracking-tight text-bb-text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-bb-violet/20 border border-bb-violet/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-bb-violet" />
              </span> AI Bro
            </h1>
            <p className="text-xs md:text-sm text-bb-text-secondary mt-1.5 max-w-xl font-semibold leading-relaxed">
              Your personal financial companion. Learn from your spending, ask real-time budgeting questions, and build smarter money habits.
            </p>
          </div>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setIsClearConfirmOpen(true)} 
            className="self-start md:self-center font-mono"
          >
            clear memory
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* LEFT: AI Chat Interface */}
        <Card accent="none" glassy className="lg:col-span-7 p-6 flex flex-col h-[550px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-bb-border pb-4 mb-4 select-none">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-bb-violet" />
              <h2 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">Chat Room</h2>
            </div>
          </div>

          {/* Personality Switcher — compact row below header, above suggested questions */}
          <div className="flex gap-1.5 mb-3 flex-shrink-0 flex-wrap">
            {(['bestie', 'professional', 'coach', 'calm'] as const).map((p) => {
              const labels: Record<string, string> = { bestie: '💅', professional: '💼', coach: '🚀', calm: '🧘' };
              return (
                <Button
                  key={p}
                  variant={activePersonality === p ? 'ghost' : 'secondary'}
                  size="sm"
                  className="text-[9px] px-2 py-1"
                  onClick={() => {
                    setActivePersonality(p);
                    preferencesEngine.savePreferences(userId, { aiBroPersonality: p });
                  }}
                >
                  {labels[p]} {p}
                </Button>
              );
            })}
          </div>

          {/* Suggested Questions — above message list */}
          {messages.length <= 2 && (
            <div className="mb-3 flex-shrink-0">
              <p className="text-[9px] text-bb-text-muted font-bold uppercase tracking-wider mb-2 font-mono select-none">Suggested Questions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    size="sm"
                    onClick={() => sendMessage(q.replace(/\s*[\u{1F300}-\u{1F9FF}]/gu, '').trim())}
                    className="text-[10px]"
                    rightIcon={<ArrowRight size={10} />}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 animate-bb-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* 2. Message avatars & bubbles */}
                <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-bb-border text-xs font-black select-none ${
                  msg.role === 'user' 
                    ? 'bg-bb-violet text-bb-violet-fg' 
                    : 'bg-bb-lime text-bb-lime-fg'
                }`}>
                  {msg.role === 'user' ? <UserIcon size={12} /> : <BrandMark size="sm" />}
                </div>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-bb-sm text-xs font-semibold tracking-wide leading-relaxed border-2 ${
                    msg.role === 'user'
                      ? 'bg-bb-surface border-bb-violet text-bb-text-primary rounded-tr-none'
                      : 'bg-bb-surface border-bb-border text-bb-text-primary rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              /* 3. Typing Indicator */
              <div className="flex gap-3 animate-bb-slide-up">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-bb-border bg-bb-lime text-bb-lime-fg text-xs select-none">
                  <BrandMark size="sm" />
                </div>
                <div className="bg-bb-surface border-2 border-bb-border px-4 py-3 rounded-bb-sm rounded-tl-none text-xs font-semibold text-bb-text-muted flex items-center gap-2">
                  <Sparkles size={12} className="text-bb-violet animate-pulse" />
                  <span>{THINKING_MESSAGES[thinkingIndex]}</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-2 border-t-2 border-bb-border pt-4 flex-shrink-0">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your budget, or tell me what you spent..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              variant="primary"
              className="px-4"
            >
              <Send size={12} />
            </Button>
          </form>
        </Card>

        {/* RIGHT: Budget Recommendations & Categorized Insights */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:h-[550px]">
          {/* Budget Card — flex-shrink-0: fixed height, no internal scroll needed */}
          <Card accent="none" glassy className="p-6 flex-shrink-0">
            <h3 className="text-label text-bb-text-muted mb-4 flex items-center gap-1.5 select-none">
              <TrendingUp size={14} className="text-bb-violet" />
              Budget Status
            </h3>
            {allowance === 0 ? (
              <div className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-center select-none">
                <AlertCircle className="mx-auto mb-2 text-bb-violet" size={20} />
                <p className="text-xs font-semibold text-bb-text-primary">Allowance not set</p>
                <p className="text-[10px] text-bb-text-muted mt-1">Configure your allowance in Settings to activate tracker.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Indicator Banner */}
                <div className={`p-3 rounded-bb-sm border-2 text-[11px] font-semibold flex items-center gap-2 select-none ${statusColor}`}>
                  <span>{statusEmoji}</span>
                  <span>{statusText}</span>
                </div>

                {/* 5. Budget status blocks */}
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock
                    label="Allowance Used"
                    value={`${pct}%`}
                    sub={`${currency}${spent.toLocaleString('en-IN')} spent`}
                    accent="violet"
                    size="sm"
                  />
                  <StatBlock
                    label="Remaining Budget"
                    value={`${currency}${remaining.toLocaleString('en-IN')}`}
                    sub={`of ${currency}${allowance.toLocaleString('en-IN')}`}
                    accent={remaining < 0 ? 'coral' : 'lime'}
                    size="sm"
                  />
                </div>

                {/* 6. Progress bar */}
                <ProgressBar
                  percentage={pct}
                  color={pct >= 90 ? 'coral' : pct >= 60 ? 'violet' : 'lime'}
                  height={12}
                  showLabel={false}
                />
              </div>
            )}
          </Card>

          {/* Grouped Insights Card — flex-1 min-h-0 so it fills remaining height */}
          <Card accent="none" glassy className="p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-label text-bb-text-muted mb-4 flex items-center gap-1.5 select-none flex-shrink-0">
              <Sparkles size={14} className="text-bb-violet" />
              Financial Intelligence
            </h3>

            {!hasEnoughData ? (
              /* 7. Onboarding EmptyState primitive */
              <EmptyState
                accent="neutral"
                title="Log transactions to activate insights"
                description="Log at least 3 transactions to reveal patterns, weekly averages, and spending spikes."
                icon={<Sparkles size={24} className="text-bb-lime" />}
                className="flex-1 min-h-0"
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {top3Insights.map((item, idx) => (
                  <InsightItem key={idx} item={item} />
                ))}

                {top3Insights.length === 0 && (
                  /* 7. Onboarding EmptyState primitive alternative fallback */
                  <EmptyState
                    accent="neutral"
                    title="No pattern detected yet"
                    description="Keep logging daily transactions. I'm watching closely! 👀"
                    icon={<HelpCircle size={32} className="text-bb-text-muted" />}
                  />
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearHistoryConfirm}
        title="Clear Memory"
        message="Are you sure you want to clear the conversation history? This will permanently wipe all chat logs."
        confirmText="Yes, clear history"
        cancelText="Cancel"
      />
    </div>
  );
}

/* 5. Insight list items migrated to StatBlock */
function InsightItem({ item }: { item: { title: string; description: string; emoji: string } }) {
  return (
    <StatBlock
      label=""
      value={item.title}
      sub={item.description}
      icon={<span className="text-xl select-none">{item.emoji}</span>}
      accent="lime"
      size="xs"
      font="display"
      className="bg-bb-lime/10 border-bb-lime/20"
      subClassName="text-bb-violet font-semibold"
    />
  );
}
