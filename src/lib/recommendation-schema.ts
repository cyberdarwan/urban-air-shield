import { Type } from '@google/genai';

/**
 * Structured JSON output schema passed to Gemini for personalized daily air guidance.
 */
export const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    heroVerdict: { type: Type.STRING },
    officialWarnings: {
      type: Type.OBJECT,
      properties: {
        isGrapRegion: { type: Type.BOOLEAN },
        advisoryTitle: { type: Type.STRING },
        stageOrLevel: { type: Type.STRING },
        headline: { type: Type.STRING },
        bullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'isGrapRegion',
        'advisoryTitle',
        'stageOrLevel',
        'headline',
        'bullets',
      ],
    },
    clockWindows: {
      type: Type.OBJECT,
      properties: {
        bestWindowToStepOut: { type: Type.STRING },
        bestWindowReason: { type: Type.STRING },
        peakSmokeHours: { type: Type.STRING },
        peakSmokeReason: { type: Type.STRING },
      },
      required: [
        'bestWindowToStepOut',
        'bestWindowReason',
        'peakSmokeHours',
        'peakSmokeReason',
      ],
    },
    todaysPracticalMoves: {
      type: Type.OBJECT,
      properties: {
        onTheMove: { type: Type.STRING },
        atHome: { type: Type.STRING },
        forYourHousehold: { type: Type.STRING },
        quickChecklist: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'onTheMove',
        'atHome',
        'forYourHousehold',
        'quickChecklist',
      ],
    },
    futureLifestyleUpgrades: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        upgrades: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              whyItHelps: { type: Type.STRING },
            },
            required: ['title', 'description', 'whyItHelps'],
          },
        },
      },
      required: ['summary', 'upgrades'],
    },
  },
  required: [
    'heroVerdict',
    'officialWarnings',
    'clockWindows',
    'todaysPracticalMoves',
    'futureLifestyleUpgrades',
  ],
};
