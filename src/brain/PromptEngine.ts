import { ChatMessage } from '../models/modelTypes';

export const DEFAULT_CONTEXT_WINDOW = 4096;
export const DEFAULT_MAX_OUTPUT_TOKENS = 512;
export const QWEN_STOP_STRINGS = ['<|im_end|>', '<|endoftext|>'];

/**
 * Estimates token count accurately across English, Tanglish, and Unicode scripts (Tamil).
 * - English/Tanglish: ~3.8 chars per token
 * - Tamil Unicode: ~1.8 chars per token (due to multibyte UTF-8 representation in byte-pair tokenizers)
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  const tamilRegex = /[\u0B80-\u0BFF]/g;
  const tamilChars = (text.match(tamilRegex) || []).length;
  const nonTamilChars = text.length - tamilChars;

  tokens += Math.ceil(tamilChars / 1.8);
  tokens += Math.ceil(nonTamilChars / 3.8);
  return Math.max(1, tokens);
}

/**
 * Strips all `<think>...</think>` tags and unclosed `<think>...` blocks from text.
 * Used for Qwen3 reasoning suppression and clean user responses.
 */
export function stripThinkingTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

/**
 * Streaming filter that intercepts tokens during generation and suppresses any `<think>...</think>` blocks in real time.
 */
export class ThinkingStreamFilter {
  private buffer = '';
  private insideThink = false;
  private readonly onFilteredToken: (token: string) => void;

  constructor(onFilteredToken: (token: string) => void) {
    this.onFilteredToken = onFilteredToken;
  }

  public processToken(token: string): void {
    this.buffer += token;

    while (this.buffer.length > 0) {
      if (!this.insideThink) {
        const thinkStartIdx = this.buffer.toLowerCase().indexOf('<think>');
        if (thinkStartIdx === -1) {
          // If buffer ends with a partial prefix like '<th' or '<think', hold back
          const matchPartial = this.buffer.match(/<t?(?:h(?:i(?:n(?:k)?)?)?)?$/i);
          if (matchPartial && matchPartial.index !== undefined) {
            const emitText = this.buffer.substring(0, matchPartial.index);
            this.buffer = this.buffer.substring(matchPartial.index);
            if (emitText.length > 0) {
              this.onFilteredToken(emitText);
            }
            break;
          } else {
            this.onFilteredToken(this.buffer);
            this.buffer = '';
            break;
          }
        } else {
          // Emit content before <think>
          if (thinkStartIdx > 0) {
            this.onFilteredToken(this.buffer.substring(0, thinkStartIdx));
          }
          this.insideThink = true;
          this.buffer = this.buffer.substring(thinkStartIdx + 7); // skip '<think>'
        }
      } else {
        // We are inside <think>
        const thinkEndIdx = this.buffer.toLowerCase().indexOf('</think>');
        if (thinkEndIdx === -1) {
          // Still inside think block; discard everything except potential partial '</think'
          const matchPartialEnd = this.buffer.match(/<\/?(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i);
          if (matchPartialEnd && matchPartialEnd.index !== undefined) {
            this.buffer = this.buffer.substring(matchPartialEnd.index);
          } else {
            this.buffer = '';
          }
          break;
        } else {
          this.insideThink = false;
          this.buffer = this.buffer.substring(thinkEndIdx + 8); // skip '</think>'
        }
      }
    }
  }

  public flush(): void {
    if (!this.insideThink && this.buffer.length > 0) {
      this.onFilteredToken(this.buffer);
    }
    this.buffer = '';
    this.insideThink = false;
  }
}

/**
 * Trims conversation history so that total tokens (system prompt + history + user prompt + max output)
 * strictly fits within the context budget (n_ctx = 4096), dropping oldest turns first.
 */
export function trimConversationHistory(
  history: ChatMessage[],
  systemPromptTokens: number,
  userPromptTokens: number,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
  contextLimit: number = DEFAULT_CONTEXT_WINDOW
): ChatMessage[] {
  const availableBudget = contextLimit - (systemPromptTokens + userPromptTokens + maxOutputTokens + 40); // 40 tokens overhead for ChatML tags
  if (availableBudget <= 0) {
    return [];
  }

  const result: ChatMessage[] = [];
  let currentTokens = 0;

  // Traverse backwards from newest history turn to oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = estimateTokenCount(msg.content) + 8; // overhead per ChatML message
    if (currentTokens + msgTokens <= availableBudget) {
      result.unshift(msg);
      currentTokens += msgTokens;
    } else {
      // Exceeded budget; older messages are dropped
      break;
    }
  }

  return result;
}

/**
 * Builds standard ChatML prompt for Qwen models:
 * - Prepends /no_think to the system prompt to disable Qwen thinking mode.
 * - Formats multi-turn history within token budget.
 * - Appends current user prompt and assistant starter token.
 */
export function buildChatMLPrompt(
  systemPrompt: string,
  history: ChatMessage[],
  userPrompt: string,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
  contextLimit: number = DEFAULT_CONTEXT_WINDOW
): { prompt: string; trimmedHistory: ChatMessage[]; totalTokensEstimate: number } {
  // 1. Enforce /no_think flag in system prompt for Qwen3
  const effectiveSystemPrompt = systemPrompt.includes('/no_think')
    ? systemPrompt
    : `/no_think\n${systemPrompt}`;

  const systemTokens = estimateTokenCount(effectiveSystemPrompt);
  const userTokens = estimateTokenCount(userPrompt);

  // 2. Budget and trim history (drop oldest turns first)
  const trimmedHistory = trimConversationHistory(
    history,
    systemTokens,
    userTokens,
    maxOutputTokens,
    contextLimit
  );

  // 3. Assemble ChatML string
  let prompt = `<|im_start|>system\n${effectiveSystemPrompt}<|im_end|>\n`;

  for (const msg of trimmedHistory) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const content = stripThinkingTags(msg.content.replace(/^⚠️.*?\n\n/s, ''));
    prompt += `<|im_start|>${role}\n${content}<|im_end|>\n`;
  }

  prompt += `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;

  const totalTokensEstimate = estimateTokenCount(prompt);

  return { prompt, trimmedHistory, totalTokensEstimate };
}
