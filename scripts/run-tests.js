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

try {
  // 1. Run PromptEngine Unit Tests
  const { runPromptTests } = require('../src/__tests__/prompt.test.ts');
  runPromptTests();
  passedTests += 6;

  // 2. Run BillingParserService Unit Tests
  const { runBillingParserTests } = require('../src/__tests__/billingParser.test.ts');
  runBillingParserTests();
  passedTests += 9;

  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests} UNIT TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST RUNNER FAILED:');
  console.error(err);
  process.exit(1);
}
