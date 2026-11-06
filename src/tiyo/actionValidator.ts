import { TiyoAction, TiyoEmotion, TiyoResponse } from './types';

export const ALLOWED_ACTIONS: readonly TiyoAction[] = [
  'greet',
  'smile',
  'wave',
  'thumbs_up',
  'goodbye',
  'idle',
] as const;

export const ALLOWED_EMOTIONS: readonly TiyoEmotion[] = [
  'happy',
  'neutral',
  'curious',
  'sad',
  'excited',
] as const;

/**
 * Robust parser for Tiyo LLM output.
 * Output JSON schema: {"response": string, "action": string, "emotion": string}
 * If JSON parsing fails or shape is invalid:
 * - Sanitizes raw text as response
 * - Falls back to action: 'idle'
 * - Falls back to emotion: 'neutral'
 * - Never throws or crashes.
 */
export function parseTiyoResponse(rawOutput: string): TiyoResponse {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return {
      response: 'Hello! How can I help you today?',
      action: 'idle',
      emotion: 'neutral',
      rawText: '',
    };
  }

  const cleanRaw = rawOutput.trim();

  // 1. Try direct JSON parsing
  try {
    const parsed = JSON.parse(cleanRaw);
    if (parsed && typeof parsed === 'object') {
      return sanitizeParsedObject(parsed, cleanRaw);
    }
  } catch {
    // Continue to regex extraction
  }

  // 2. Try extracting JSON object substring via regex (handles markdown code fences ```json ... ```)
  const jsonMatch = cleanRaw.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted && typeof extracted === 'object') {
        return sanitizeParsedObject(extracted, cleanRaw);
      }
    } catch {
      // Continue to regex-based field fallback
    }
  }

  // 3. Fallback: Regex extraction of individual fields if JSON was slightly malformed
  const responseMatch = cleanRaw.match(/"response"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  const actionMatch = cleanRaw.match(/"action"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  const emotionMatch = cleanRaw.match(/"emotion"\s*:\s*"((?:\\.|[^"\\])*)"/i);

  if (responseMatch) {
    const extractedResponse = unescapeJsonString(responseMatch[1]);
    const rawAction = actionMatch ? actionMatch[1].toLowerCase() : 'idle';
    const rawEmotion = emotionMatch ? emotionMatch[1].toLowerCase() : 'neutral';

    return {
      response: extractedResponse || cleanRaw,
      action: validateAction(rawAction),
      emotion: validateEmotion(rawEmotion),
      rawText: cleanRaw,
    };
  }

  // 4. Absolute fallback: Return raw text cleanly stripped, action 'idle', emotion 'neutral'
  const fallbackText = cleanRaw
    .replace(/^\{+/, '')
    .replace(/\}+$/, '')
    .trim();

  return {
    response: fallbackText || 'I am ready to help you.',
    action: 'idle',
    emotion: 'neutral',
    rawText: cleanRaw,
  };
}

function sanitizeParsedObject(obj: any, rawText: string): TiyoResponse {
  const rawResponse = typeof obj.response === 'string' ? obj.response.trim() : '';
  const rawAction = typeof obj.action === 'string' ? obj.action.trim().toLowerCase() : '';
  const rawEmotion = typeof obj.emotion === 'string' ? obj.emotion.trim().toLowerCase() : '';

  return {
    response: rawResponse || rawText,
    action: validateAction(rawAction),
    emotion: validateEmotion(rawEmotion),
    rawText,
  };
}

export function validateAction(action: any): TiyoAction {
  if (typeof action === 'string' && ALLOWED_ACTIONS.includes(action as TiyoAction)) {
    return action as TiyoAction;
  }
  return 'idle';
}

export function validateEmotion(emotion: any): TiyoEmotion {
  if (typeof emotion === 'string' && ALLOWED_EMOTIONS.includes(emotion as TiyoEmotion)) {
    return emotion as TiyoEmotion;
  }
  return 'neutral';
}

function unescapeJsonString(str: string): string {
  try {
    return JSON.parse(`"${str}"`);
  } catch {
    return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

