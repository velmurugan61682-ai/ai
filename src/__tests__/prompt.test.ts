import assert from 'node:assert';
import {
  buildChatMLPrompt,
  stripThinkingTags,
  ThinkingStreamFilter,
  trimConversationHistory,
  estimateTokenCount,
  DEFAULT_CONTEXT_WINDOW,
  QWEN_STOP_STRINGS,
} from '../brain/PromptEngine';
import { ChatMessage } from '../models/modelTypes';

export function runPromptTests() {
  console.log('--- Running PromptEngine Unit Tests ---');

  // Test 1: stripThinkingTags handles closed, multiline, and unclosed <think> blocks
  {
    const input1 = '<think>I should think about billing.</think>Seri, vanilla cake add panniten.';
    const result1 = stripThinkingTags(input1);
    assert.strictEqual(result1, 'Seri, vanilla cake add panniten.', 'Should strip closed <think> block');

    const input2 = '<think>\nStep 1: Check inventory\nStep 2: Calculate\n</think>\nTotal 300 rupees.';
    const result2 = stripThinkingTags(input2);
    assert.strictEqual(result2, 'Total 300 rupees.', 'Should strip multiline <think> block');

    const input3 = 'Hello owner! <think>unfinished internal thoughts...';
    const result3 = stripThinkingTags(input3);
    assert.strictEqual(result3, 'Hello owner!', 'Should strip unclosed trailing <think> block');

    console.log('  ✅ stripThinkingTags passed');
  }

  // Test 2: ThinkingStreamFilter suppresses tokens inside <think>...</think> in real-time
  {
    const emittedTokens: string[] = [];
    const filter = new ThinkingStreamFilter((t) => emittedTokens.push(t));

    const streamedChunks = [
      'Hello ',
      'there! ',
      '<th',
      'ink>',
      'Hidden reasoning step 1 ',
      'and step 2',
      '</think>',
      ' How can I ',
      'help today?'
    ];

    for (const chunk of streamedChunks) {
      filter.processToken(chunk);
    }
    filter.flush();

    const output = emittedTokens.join('');
    assert.strictEqual(output, 'Hello there!  How can I help today?', 'Stream filter should eliminate think tokens');
    assert.ok(!output.includes('Hidden reasoning'), 'Thinking content must not leak into stream');
    console.log('  ✅ ThinkingStreamFilter passed');
  }

  // Test 3: buildChatMLPrompt enforces /no_think in system prompt and valid ChatML tags
  {
    const system = 'You are Tiyo, a smart human shop employee.';
    const userPrompt = 'Rendu Pepsi add pannu';
    const { prompt } = buildChatMLPrompt(system, [], userPrompt);

    assert.ok(prompt.includes('<|im_start|>system\n/no_think\n'), 'Prompt must prepend /no_think');
    assert.ok(prompt.includes('<|im_start|>user\nRendu Pepsi add pannu<|im_end|>\n<|im_start|>assistant\n'), 'Prompt must format ChatML turns correctly');
    assert.ok(prompt.startsWith('<|im_start|>system'), 'Must start with system tag');
    assert.ok(prompt.endsWith('<|im_start|>assistant\n'), 'Must end with assistant open tag');
    console.log('  ✅ buildChatMLPrompt ChatML & /no_think formatting passed');
  }

  // Test 4: Stop strings replace ["<|im_end|>", "<|endoftext|>"] without 'user\n'
  {
    assert.deepStrictEqual(QWEN_STOP_STRINGS, ['<|im_end|>', '<|endoftext|>'], 'QWEN_STOP_STRINGS must match specification');
    assert.ok(!QWEN_STOP_STRINGS.includes('user\n'), 'Must not include user\\n stop string');
    console.log('  ✅ Stop strings configuration passed');
  }

  // Test 5: trimConversationHistory drops oldest messages when budget is tight
  {
    const history: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Turn 1 oldest user message with lots of text that takes tokens', timestamp: 1 },
      { id: '2', role: 'assistant', content: 'Turn 1 oldest assistant reply with lots of text', timestamp: 2 },
      { id: '3', role: 'user', content: 'Turn 2 middle user message', timestamp: 3 },
      { id: '4', role: 'assistant', content: 'Turn 2 middle assistant reply', timestamp: 4 },
      { id: '5', role: 'user', content: 'Turn 3 recent user message', timestamp: 5 },
      { id: '6', role: 'assistant', content: 'Turn 3 recent assistant reply', timestamp: 6 },
    ];

    // Constrain context limit so only latest messages fit
    const trimmed = trimConversationHistory(
      history,
      50, // system prompt tokens
      50, // user prompt tokens
      512, // max output
      750 // small context limit to force trimming
    );

    assert.ok(trimmed.length < history.length, 'Old messages should be trimmed');
    assert.strictEqual(trimmed[trimmed.length - 1].id, '6', 'Latest turn must be preserved');
    assert.ok(!trimmed.some((m) => m.id === '1'), 'Oldest turn 1 should be dropped');
    console.log('  ✅ trimConversationHistory token budgeting passed');
  }

  // Test 6: estimateTokenCount accurately estimates English and Tamil Unicode
  {
    const enText = 'This is an English sentence for token estimation.';
    const enTokens = estimateTokenCount(enText);
    assert.ok(enTokens >= 10 && enTokens <= 20, `English token estimation sensible (${enTokens})`);

    const taText = 'இரண்டு டீ மற்றும் ஒரு காபி போடு';
    const taTokens = estimateTokenCount(taText);
    assert.ok(taTokens >= 8 && taTokens <= 25, `Tamil token estimation sensible (${taTokens})`);
    console.log('  ✅ estimateTokenCount passed');
  }

  console.log('--- All PromptEngine tests PASSED ---\n');
}
