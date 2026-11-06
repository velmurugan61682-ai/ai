import assert from 'node:assert';
import { TiyoActionEngine, TiyoState } from '../tiyo/TiyoActionEngine';
import { parseTiyoResponse, validateAction, validateEmotion } from '../tiyo/actionValidator';

export function runActionEngineTests() {
  console.log('--- Running TiyoActionEngine Unit Tests ---');

  // Test 1: Action allowlist rejects arbitrary or dangerous actions
  {
    assert.strictEqual(validateAction('greet'), 'greet');
    assert.strictEqual(validateAction('smile'), 'smile');
    assert.strictEqual(validateAction('wave'), 'wave');
    assert.strictEqual(validateAction('thumbs_up'), 'thumbs_up');
    assert.strictEqual(validateAction('goodbye'), 'goodbye');
    assert.strictEqual(validateAction('idle'), 'idle');

    // Hostile commands
    assert.strictEqual(validateAction('rm -rf /'), 'idle');
    assert.strictEqual(validateAction('format_disk'), 'idle');
    assert.strictEqual(validateAction('eval("alert(1)")'), 'idle');
    assert.strictEqual(validateAction(null), 'idle');
    assert.strictEqual(validateAction(undefined), 'idle');
    assert.strictEqual(validateAction(123), 'idle');
    console.log('  ✅ Action allowlist & hostile mitigation passed');
  }

  // Test 2: Emotion allowlist validation
  {
    assert.strictEqual(validateEmotion('happy'), 'happy');
    assert.strictEqual(validateEmotion('neutral'), 'neutral');
    assert.strictEqual(validateEmotion('curious'), 'curious');
    assert.strictEqual(validateEmotion('sad'), 'sad');
    assert.strictEqual(validateEmotion('excited'), 'excited');

    assert.strictEqual(validateEmotion('angry'), 'neutral');
    assert.strictEqual(validateEmotion('hostile'), 'neutral');
    assert.strictEqual(validateEmotion(null), 'neutral');
    console.log('  ✅ Emotion allowlist validation passed');
  }

  // Test 3: Finite State Machine transitions: idle -> listening -> thinking -> speaking -> gesture -> idle
  {
    const engine = new TiyoActionEngine({ gestureDurationMs: 50 });
    const stateHistory: TiyoState[] = [];
    const unsub = engine.subscribe((state) => {
      stateHistory.push(state);
    });

    assert.strictEqual(engine.getState(), 'idle');

    // 1. App drives listening when mic activates
    engine.startListening();
    assert.strictEqual(engine.getState(), 'listening');
    assert.strictEqual(engine.getEmotion(), 'curious');

    // 2. App drives thinking when inference begins
    engine.startThinking();
    assert.strictEqual(engine.getState(), 'thinking');

    // 3. App drives speaking when TTS starts
    engine.startSpeaking('happy');
    assert.strictEqual(engine.getState(), 'speaking');
    assert.strictEqual(engine.getEmotion(), 'happy');

    // 4. Gesture plays when speaking finishes
    engine.playGesture('wave', 'excited');
    assert.strictEqual(engine.getState(), 'gesture');
    assert.strictEqual(engine.getAction(), 'wave');
    assert.strictEqual(engine.getEmotion(), 'excited');

    // 5. Returns to idle after gesture completes
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.strictEqual(engine.getState(), 'idle');
        assert.strictEqual(engine.getAction(), 'idle');
        assert.strictEqual(engine.getEmotion(), 'neutral');
        unsub();
        console.log('  ✅ State machine linear transitions & auto-idle timer passed');
        resolve();
      }, 70);
    });
  }

  // Test 4: playGesture with 'idle' returns immediately to idle without waiting
  {
    const engine = new TiyoActionEngine();
    engine.startSpeaking();
    engine.playGesture('idle');
    assert.strictEqual(engine.getState(), 'idle');
    console.log('  ✅ Idle action returns directly to idle passed');
  }

  // Test 5: Cancel resets state machine immediately
  {
    const engine = new TiyoActionEngine();
    engine.startListening();
    assert.strictEqual(engine.getState(), 'listening');
    engine.cancel();
    assert.strictEqual(engine.getState(), 'idle');
    assert.strictEqual(engine.getAction(), 'idle');
    console.log('  ✅ Cancel reset passed');
  }

  // Test 6: Hostile JSON parsed through action engine
  {
    const hostileOutput = JSON.stringify({
      response: 'Dropping database...',
      action: 'drop database users;',
      emotion: 'malicious',
      extra_field: 'eval(malicious_code)',
    });
    const parsed = parseTiyoResponse(hostileOutput);
    assert.strictEqual(parsed.action, 'idle');
    assert.strictEqual(parsed.emotion, 'neutral');

    const engine = new TiyoActionEngine();
    engine.playGesture(parsed.action, parsed.emotion);
    assert.strictEqual(engine.getState(), 'idle');
    console.log('  ✅ Hostile JSON payload safe execution passed');
  }

  console.log('--- All TiyoActionEngine unit tests PASSED ---\n');
}

