import assert from 'node:assert';
import {
  parseTiyoResponse,
  validateAction,
  validateEmotion,
  ALLOWED_ACTIONS,
  ALLOWED_EMOTIONS,
} from '../tiyo/actionValidator';
import {
  buildTiyoPrompt,
  TIYO_ENGLISH_SYSTEM_PROMPT,
} from '../tiyo/tiyoPrompt';
import { TiyoMessage } from '../tiyo/types';

export function runTiyoBrainTests() {
  console.log('--- Running TiyoBrain Unit Tests ---');

  // Test 1: JSON Parsing of valid model output
  {
    const input = JSON.stringify({
      response: 'Hello! I am Tiyo, happy to meet you.',
      action: 'wave',
      emotion: 'happy',
    });
    const parsed = parseTiyoResponse(input);
    assert.strictEqual(parsed.response, 'Hello! I am Tiyo, happy to meet you.');
    assert.strictEqual(parsed.action, 'wave');
    assert.strictEqual(parsed.emotion, 'happy');
    console.log('  ✅ Valid JSON response parsing passed');
  }

  // Test 2: JSON Parsing with markdown code blocks (```json ... ```)
  {
    const input = '```json\n{"response": "Nice to see you!", "action": "greet", "emotion": "curious"}\n```';
    const parsed = parseTiyoResponse(input);
    assert.strictEqual(parsed.response, 'Nice to see you!');
    assert.strictEqual(parsed.action, 'greet');
    assert.strictEqual(parsed.emotion, 'curious');
    console.log('  ✅ Markdown code block JSON extraction passed');
  }

  // Test 3: Schema-failure fallback on unparseable/malformed output
  {
    const malformed = 'This is pure text with no JSON brackets at all.';
    const parsed = parseTiyoResponse(malformed);
    assert.strictEqual(parsed.response, 'This is pure text with no JSON brackets at all.');
    assert.strictEqual(parsed.action, 'idle', 'Malformed action must fallback to idle');
    assert.strictEqual(parsed.emotion, 'neutral', 'Malformed emotion must fallback to neutral');
    console.log('  ✅ Schema failure fallback to raw text passed');
  }

  // Test 4: Hostile / invalid action sanitization
  {
    const hostile = JSON.stringify({
      response: 'Executing dangerous code',
      action: 'rm -rf /',
      emotion: 'malicious',
    });
    const parsed = parseTiyoResponse(hostile);
    assert.strictEqual(parsed.action, 'idle', 'Unknown or hostile action must be sanitized to idle');
    assert.strictEqual(parsed.emotion, 'neutral', 'Unknown emotion must be sanitized to neutral');
    console.log('  ✅ Hostile action & emotion sanitization passed');
  }

  // Test 5: Allowlist compliance
  {
    assert.deepStrictEqual(
      ALLOWED_ACTIONS,
      ['greet', 'smile', 'wave', 'thumbs_up', 'goodbye', 'idle'],
      'ALLOWED_ACTIONS must match strict 6-action allowlist'
    );
    assert.deepStrictEqual(
      ALLOWED_EMOTIONS,
      ['happy', 'neutral', 'curious', 'sad', 'excited'],
      'ALLOWED_EMOTIONS must match 5-emotion allowlist'
    );
    console.log('  ✅ Allowlist verification passed');
  }

  // Test 6: System prompt enforces English and /no_think
  {
    assert.ok(TIYO_ENGLISH_SYSTEM_PROMPT.startsWith('/no_think'), 'System prompt must start with /no_think');
    assert.ok(TIYO_ENGLISH_SYSTEM_PROMPT.includes('strictly in fluent, natural English'), 'Must enforce English-only rule');
    console.log('  ✅ System prompt /no_think and English-only rules passed');
  }

  // Test 7: History trimming retains recent turns and drops oldest within budget
  {
    const history: TiyoMessage[] = [];
    for (let i = 1; i <= 20; i++) {
      history.push({
        id: `turn-${i}`,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Message ${i}: ${'Lorem ipsum '.repeat(30)}`,
        timestamp: i * 1000,
      });
    }

    const prompt = buildTiyoPrompt(history, 'Latest user query');
    assert.ok(prompt.includes('Latest user query'), 'Prompt must include current user query');
    assert.ok(prompt.includes('Message 20'), 'Recent turn 20 must be preserved');
    assert.ok(!prompt.includes('Message 1:'), 'Old turn 1 should be trimmed out to respect budget');
    console.log('  ✅ Conversation history budget trimming passed');
  }

  console.log('--- All TiyoBrain unit tests PASSED ---\n');
}
