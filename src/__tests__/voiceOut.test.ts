import assert from 'node:assert';
import { TiyoVoiceOut } from '../tiyo/TiyoVoiceOut';

export function runVoiceOutTests() {
  console.log('--- Running TiyoVoiceOut Unit Tests ---');
  const voiceOut = TiyoVoiceOut.getInstance();

  // Test 1: Speed rate bounds clamping (0.5x to 1.5x)
  {
    voiceOut.setSpeed(1.0);
    assert.strictEqual(voiceOut.getSpeed(), 1.0);

    voiceOut.setSpeed(0.2); // below minimum
    assert.strictEqual(voiceOut.getSpeed(), 0.5, 'Must clamp to 0.5 minimum');

    voiceOut.setSpeed(2.5); // above maximum
    assert.strictEqual(voiceOut.getSpeed(), 1.5, 'Must clamp to 1.5 maximum');

    voiceOut.setSpeed(1.25);
    assert.strictEqual(voiceOut.getSpeed(), 1.25);
    console.log('  ✅ Speed clamping (0.5x to 1.5x) passed');
  }

  // Test 2: Mouth movement callback receives valid oscillation bounds
  {
    const mouthRatios: number[] = [];
    (voiceOut as any).startMouthOscillation((ratio: number) => {
      mouthRatios.push(ratio);
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        (voiceOut as any).stopMouthOscillation((ratio: number) => {
          mouthRatios.push(ratio);
        });

        assert.ok(mouthRatios.length > 0, 'Mouth callbacks must have fired');
        for (const r of mouthRatios) {
          assert.ok(r >= 0 && r <= 1.0, `Ratio must stay within 0..1 range (got ${r})`);
        }
        assert.strictEqual(mouthRatios[mouthRatios.length - 1], 0, 'Final resting ratio must be 0 (closed/resting)');
        console.log('  ✅ Mouth oscillation bounds and reset passed');
        resolve();
      }, 160);
    });
  }

  // Test 3: Stop guarantees isSpeaking reset
  {
    voiceOut.stop();
    assert.strictEqual(voiceOut.getIsSpeaking(), false, 'isSpeaking must be false after stop()');
    console.log('  ✅ Stop state reset passed');
  }

  console.log('--- All TiyoVoiceOut unit tests PASSED ---\n');
}
