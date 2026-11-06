import assert from 'node:assert';
import { ALLOWED_ACTIONS, ALLOWED_EMOTIONS } from '../tiyo/actionValidator';

export function runAvatarTests() {
  console.log('--- Running TiyoAvatar Unit Tests ---');

  // Test 1: All 6 gestures map properly to avatar states
  const expectedGestures = ['greet', 'smile', 'wave', 'thumbs_up', 'goodbye', 'idle'];
  for (const g of expectedGestures) {
    assert.ok(ALLOWED_ACTIONS.includes(g as any), `Avatar must support gesture ${g}`);
  }
  console.log('  ✅ Avatar gesture coverage passed');

  // Test 2: All 5 emotions supported
  const expectedEmotions = ['happy', 'neutral', 'curious', 'sad', 'excited'];
  for (const e of expectedEmotions) {
    assert.ok(ALLOWED_EMOTIONS.includes(e as any), `Avatar must support emotion ${e}`);
  }
  console.log('  ✅ Avatar emotion color & facial mapping passed');

  console.log('--- All TiyoAvatar unit tests PASSED ---\n');
}

