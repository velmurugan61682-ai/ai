const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

// Intercept react-native, expo-speech, and react-native-svg in Node.js test environment
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'react-native') {
    return {
      Platform: { OS: 'android', select: (objs) => objs.android || objs.default },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
        RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
        request: async () => 'granted',
        check: async () => true,
      },
      Linking: {
        openSettings: async () => {},
      },
      Animated: {
        Value: class {
          constructor(val) { this._val = val; }
          setValue(val) { this._val = val; }
          interpolate() { return this; }
        },
        timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
        loop: (anim) => ({ start: () => {}, stop: () => {} }),
        sequence: (anims) => ({ start: (cb) => cb && cb({ finished: true }) }),
        parallel: (anims) => ({ start: (cb) => cb && cb({ finished: true }) }),
      },
      StyleSheet: { create: (s) => s },
      View: 'View',
      Text: 'Text',
    };
  }
  if (id === 'expo-speech') {
    return {
      speak: () => {},
      stop: async () => {},
      getAvailableVoicesAsync: async () => [
        { identifier: 'en-us-x-sfg', name: 'English (US)', language: 'en-US' }
      ],
    };
  }
  if (id === 'react-native-svg') {
    return {
      default: 'Svg',
      Svg: 'Svg',
      G: 'G',
      Circle: 'Circle',
      Rect: 'Rect',
      Path: 'Path',
      Line: 'Line',
      Polygon: 'Polygon',
    };
  }
  return originalRequire.apply(this, arguments);
};

// Register .ts extension compiler in Node runtime
require.extensions['.ts'] = function (module, filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  module._compile(transpiled, filename);
};

console.log('====================================================');
console.log('🧪 SaaS AI Brain - Automated Test Suite');
console.log('====================================================\n');

let passedTests = 0;

async function main() {
  try {
    // 1. Run PromptEngine Unit Tests
    const { runPromptTests } = require('../src/__tests__/prompt.test.ts');
    await runPromptTests();
    passedTests += 6;

    // 2. Run BillingParserService Unit Tests
    const { runBillingParserTests } = require('../src/__tests__/billingParser.test.ts');
    await runBillingParserTests();
    passedTests += 9;

    // 3. Run TiyoBrain Unit Tests
    const { runTiyoBrainTests } = require('../src/__tests__/tiyoBrain.test.ts');
    await runTiyoBrainTests();
    passedTests += 7;

    // 4. Run ActionEngine Unit Tests
    const { runActionEngineTests } = require('../src/__tests__/actionEngine.test.ts');
    await runActionEngineTests();
    passedTests += 6;

    // 5. Run VoiceOut Unit Tests
    const { runVoiceOutTests } = require('../src/__tests__/voiceOut.test.ts');
    await runVoiceOutTests();
    passedTests += 3;

    // 6. Run VoiceIn Unit Tests
    const { runVoiceInTests } = require('../src/__tests__/voiceIn.test.ts');
    await runVoiceInTests();
    passedTests += 3;

    // 7. Run Avatar Unit Tests
    const { runAvatarTests } = require('../src/__tests__/avatar.test.ts');
    await runAvatarTests();
    passedTests += 2;

    console.log('====================================================');
    console.log(`🎉 ALL ${passedTests} UNIT TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUNNER FAILED:');
    console.error(err);
    process.exit(1);
  }
}

main();
