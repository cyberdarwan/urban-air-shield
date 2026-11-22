import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
] as const;

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

export interface WaterfallResult {
  text: string | null;
  generatedBy: string;
  attemptedModels: string[];
  fallbackReason: string | null;
}

export async function generateWithGeminiWaterfall(
  ai: GoogleGenAI,
  requestConfig: {
    contents: string;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: unknown;
    temperature?: number;
  },
  timeoutMs = 8000
): Promise<WaterfallResult> {
  const attemptedModels: string[] = [];
  let lastError: string | null = null;

  for (const model of GEMINI_MODEL_CHAIN) {
    attemptedModels.push(model);
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: requestConfig.contents,
          config: {
            systemInstruction: requestConfig.systemInstruction,
            responseMimeType: requestConfig.responseMimeType,
            responseSchema: requestConfig.responseSchema,
            temperature: requestConfig.temperature ?? 0.35,
          },
        }),
        timeoutMs,
        model
      );

      const text = response.text?.trim();
      if (text) {
        return {
          text,
          generatedBy: model,
          attemptedModels,
          fallbackReason: null,
        };
      }
      lastError = `${model}: empty response`;
      console.warn(`[Gemini Waterfall] ${lastError}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `${model}: ${msg}`;
      console.warn(`[Gemini Waterfall] ${model} failed -> trying next:`, msg.slice(0, 180));
    }
  }

  return {
    text: null,
    generatedBy: 'fallback',
    attemptedModels,
    fallbackReason: lastError || 'All Gemini models failed',
  };
}
