import assert from 'node:assert';
import { TiyoVoiceIn } from '../tiyo/TiyoVoiceIn';

export function runVoiceInTests() {
  console.log('--- Running TiyoVoiceIn Unit Tests ---');
  const voiceIn = TiyoVoiceIn.getInstance();

  // Test 1: Initial state is not listening
  {
    assert.strictEqual(voiceIn.getIsListening(), false, 'Should initially be idle');
    console.log('  ✅ Initial state idle passed');
  }

  // Test 2: Platform support query works safely in Node
  {
    const supported = voiceIn.isSupportedOnPlatform();
    assert.strictEqual(typeof supported, 'boolean');
    console.log('  ✅ Platform support query passed');
  }

  // Test 3: Stop listening safely resets state
  {
    voiceIn.stopListening();
    assert.strictEqual(voiceIn.getIsListening(), false);
    console.log('  ✅ Stop listening reset passed');
  }

  console.log('--- All TiyoVoiceIn unit tests PASSED ---\n');
}

