import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { callLLM, LLMUnavailableError } from '../ai/llmClient';
import { buildSystemPrompt, buildUserPrompt, AI_VALID_INTENTS, TRANSACTION_CATEGORIES } from '../ai/promptBuilder';

const router = Router();

// --- Request validation -----------------------------------------------

const contextSchema = z.object({
  currency: z.string().min(1).max(5),
  allowance: z.number(),
  spent: z.number(),
  remaining: z.number(),
  byCategory: z.array(
    z.object({
      category: z.string(),
      total: z.number(),
      count: z.number(),
    })
  ),
  recentTransactions: z.array(
    z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['income', 'expense']),
      category: z.string(),
      date: z.string(),
    })
  ),
  activeGoals: z.array(
    z.object({
      title: z.string(),
      targetAmount: z.number(),
      currentAmount: z.number(),
    })
  ),
  activeSubscriptionsMonthlyTotal: z.number(),
  streak: z.object({
    current: z.number(),
    longest: z.number(),
  }),
  personality: z.enum(['bestie', 'coach', 'professional', 'calm']),
});

const messageSchema = z.object({
  message: z.string().min(1).max(500),
  context: contextSchema,
});

// --- Response validation (what the LLM must return) --------------------

const transactionSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  type: z.enum(['income', 'expense']),
  category: z.enum(TRANSACTION_CATEGORIES),
  title: z.string().min(1).max(60),
});

const llmReplySchema = z.object({
  content: z.string().min(1).max(2000),
  intent: z.enum(AI_VALID_INTENTS).default('general'),
  transaction: transactionSchema.optional(),
});

router.post('/message', authMiddleware, async (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid chat request bestie.' });
  }

  const { message, context } = parsed.data;

  try {
    const systemPrompt = buildSystemPrompt(context.personality);
    const userPrompt = buildUserPrompt(message, context);

    const rawText = await callLLM(systemPrompt, userPrompt);
    console.log("========== RAW GEMINI ==========");
    console.log(rawText);
    console.log("===============================");

    let parsedReply: unknown;
    try {

        const cleaned = rawText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        parsedReply = JSON.parse(
          jsonStart >= 0 && jsonEnd >= jsonStart
            ? cleaned.slice(jsonStart, jsonEnd + 1)
            : cleaned
        );
    } catch (parseErr) {
      const reason = parseErr instanceof Error ? parseErr.message : 'unknown parse error';
      console.error('🚨 ai-chat JSON parse failed:', reason);
      console.error('🚨 ai-chat raw text that failed to parse:', rawText);
      throw new LLMUnavailableError(`LLM response was not valid JSON: ${reason}`);
    }

    const replyWithDefaultIntent =
      typeof parsedReply === 'object' && parsedReply !== null && !Array.isArray(parsedReply)
        ? {
            ...parsedReply,
            intent: 'intent' in parsedReply ? parsedReply.intent : 'general',
          }
        : parsedReply;

    // Trim/lowercase-normalize the enum-constrained fields only. This does
    // NOT change or invent values — "Food " and "food" are the same
    // category, but "Snacks" and "food" are still two different things and
    // will still correctly fail validation below. Genuine category/type
    // mismatches are never silently coerced.
    const normalized =
      typeof replyWithDefaultIntent === 'object' &&
      replyWithDefaultIntent !== null &&
      !Array.isArray(replyWithDefaultIntent)
        ? {
            ...replyWithDefaultIntent,
            intent:
              typeof (replyWithDefaultIntent as any).intent === 'string'
                ? (replyWithDefaultIntent as any).intent.trim().toLowerCase()
                : (replyWithDefaultIntent as any).intent,
            transaction:
              (replyWithDefaultIntent as any).transaction &&
              typeof (replyWithDefaultIntent as any).transaction === 'object'
                ? {
                    ...(replyWithDefaultIntent as any).transaction,
                    type:
                      typeof (replyWithDefaultIntent as any).transaction.type === 'string'
                        ? (replyWithDefaultIntent as any).transaction.type.trim().toLowerCase()
                        : (replyWithDefaultIntent as any).transaction.type,
                    category:
                      typeof (replyWithDefaultIntent as any).transaction.category === 'string'
                        ? (replyWithDefaultIntent as any).transaction.category.trim().toLowerCase()
                        : (replyWithDefaultIntent as any).transaction.category,
                    title:
                      typeof (replyWithDefaultIntent as any).transaction.title === 'string'
                        ? (replyWithDefaultIntent as any).transaction.title.trim()
                        : (replyWithDefaultIntent as any).transaction.title,
                  }
                : (replyWithDefaultIntent as any).transaction,
          }
        : replyWithDefaultIntent;

    const validated = llmReplySchema.safeParse(normalized);
    if (!validated.success) {
      // Pinpoint exactly which field(s) failed and why, instead of a
      // generic "didn't match schema" — makes future prompt/model drift
      // diagnosable from server logs alone.
      const issues = validated.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join(' | ');
      console.error('🚨 ai-chat schema validation failed:', issues);
      console.error('🚨 ai-chat offending payload:', JSON.stringify(normalized));
      throw new LLMUnavailableError(`LLM response did not match expected schema: ${issues}`);
    }

    return res.json(validated.data);
  } catch (err) {
    // Any failure here (missing key, network error, bad LLM output) should
    // surface as a clean 503 so the client falls back to aiBroEngine.
    const reason = err instanceof Error ? err.message : 'Unknown error';
    console.error('🚨 ai-chat LLM failure, client should fall back:', reason);
    return res.status(503).json({ error: 'AI companion is offline right now.' });
  }
});

export default router;
