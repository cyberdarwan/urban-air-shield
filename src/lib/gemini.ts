import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-3.8-flash';

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000,
  label = 'Gemini request'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
