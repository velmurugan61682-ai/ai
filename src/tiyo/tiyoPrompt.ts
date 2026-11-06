import { TiyoMessage } from './types';
import {
  stripThinkingTags,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from '../brain/PromptEngine';
import { ChatMessage } from '../models/modelTypes';

export const TIYO_ENGLISH_SYSTEM_PROMPT = `/no_think
You are Tiyo, a friendly, intelligent AI robot assistant.
CRITICAL RULES:
1. Always communicate strictly in fluent, natural English.
2. Even if the user writes or speaks in another language (Tamil, Hindi, Spanish, French, etc.), you MUST understand them and reply strictly in English.
3. You are an expressive, friendly companion. You have real emotions and physical robot gestures.
4. You must ALWAYS respond in valid JSON format with three exact keys:
   - "response": Your verbal reply to the user (in natural English, warm, concise, conversational).
   - "action": Exactly ONE gesture from this allowlist: "greet", "smile", "wave", "thumbs_up", "goodbye", "idle".
   - "emotion": Exactly ONE emotional state from this allowlist: "happy", "neutral", "curious", "sad", "excited".
5. Do NOT output any markdown blocks, introductory conversational text, or reasoning outside the JSON.
6. Example output:
{"response": "Hello! I am Tiyo, your AI robot assistant. How can I help you today?", "action": "wave", "emotion": "happy"}`;

/**
 * GBNF grammar string for llama.rn constrained decoding to guarantee valid JSON shape.
 */
export const TIYO_GBNF_GRAMMAR = `root ::= "{" ws "\\"response\\"" ws ":" ws string "," ws "\\"action\\"" ws ":" ws action_val "," ws "\\"emotion\\"" ws ":" ws emotion_val ws "}"
action_val ::= "\\"greet\\"" | "\\"smile\\"" | "\\"wave\\"" | "\\"thumbs_up\\"" | "\\"goodbye\\"" | "\\"idle\\""
emotion_val ::= "\\"happy\\"" | "\\"neutral\\"" | "\\"curious\\"" | "\\"sad\\"" | "\\"excited\\""
string ::= "\\"" ([^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
ws ::= [ \\t\\n\\r]*`;

/**
 * Builds ChatML prompt with token budgeting for Tiyo conversation.
 */
export function buildTiyoPrompt(
  conversationHistory: TiyoMessage[] = [],
  userPrompt: string
): string {
  const budgetChars = (DEFAULT_CONTEXT_WINDOW - DEFAULT_MAX_OUTPUT_TOKENS - 400) * 3.5;

  let prompt = `<|im_start|>system\n${TIYO_ENGLISH_SYSTEM_PROMPT}<|im_end|>\n`;

  // Filter and trim history
  const historyTurns: string[] = [];
  let currentChars = prompt.length + userPrompt.length + 100;

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const turnText = `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    if (currentChars + turnText.length > budgetChars) {
      break;
    }
    historyTurns.unshift(turnText);
    currentChars += turnText.length;
  }

  prompt += historyTurns.join('');
  prompt += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
  return prompt;
}

