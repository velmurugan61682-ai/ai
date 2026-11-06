const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Register .ts extension compiler in Node runtime
require.extensions['.ts'] = function (module, filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
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
