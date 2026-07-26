/**
 * llmClient.ts
 *
 * Thin wrapper over the Google Gemini "generateContent" REST API.
 * Chosen for the hackathon build because it requires no credit card and
 * has a genuinely free tier — see HANDOFF.md Section 10 for the swap-in
 * points if this ever needs to move to Anthropic/OpenAI instead (the
 * shape this module exposes — callLLM(systemPrompt, userPrompt) => string —
 * is provider-agnostic, so only this one file would need to change).
 *
 * Uses Node's native fetch (Node 22+, matches the rest of this backend).
 * No new npm dependency added.
 */

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class LLMUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMUnavailableError';
  }
}

/**
 * Calls the LLM with a system prompt + user prompt and returns the raw
 * text of the model's reply. Callers are responsible for parsing/validating
 * that text (see promptBuilder.ts / routes/aiChat.ts).
 *
 * Throws LLMUnavailableError on any failure — missing key, network error,
 * non-2xx response, or an empty/malformed completion — so callers can
 * catch this one error type and fall back to the rule-based chatbot.
 */
export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new LLMUnavailableError('GEMINI_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (err) {
    throw new LLMUnavailableError(
      `Gemini request failed: ${err instanceof Error ? err.message : 'unknown network error'}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    // Logged at full length (not truncated) specifically so a bad
    // GEMINI_MODEL value or invalid/expired key shows up clearly in the
    // server console instead of only surfacing as a silent fallback.
    console.error(`🚨 Gemini API error (model="${GEMINI_MODEL}", status=${res.status}):`, errBody);
    throw new LLMUnavailableError(`Gemini returned ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data: any = await res.json().catch(() => null);
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error('🚨 Gemini returned no usable text. Full response:', JSON.stringify(data));
    throw new LLMUnavailableError('Gemini returned an empty or malformed completion');
  }

  return text;
}
