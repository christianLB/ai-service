import OpenAI from 'openai';

// Lazily obtain an OpenAI client. If no API key is configured,
// return null so callers can gracefully disable AI features.
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    return new OpenAI({ apiKey });
  } catch {
    return null;
  }
}
