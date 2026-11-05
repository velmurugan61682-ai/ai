import assert from 'node:assert';
import { BillingParserService } from '../services/BillingParserService';

export function runBillingParserTests() {
  console.log('--- Running BillingParserService Unit Tests ---');
  const parser = BillingParserService.getInstance();

  // Test 1: "Rendu Pepsi add pannu" -> { action: 'add', item: 'Pepsi', qty: 2 }
  {
    const res = parser.parse('Rendu Pepsi add pannu');
    assert.strictEqual(res.matched, true, 'Should match billing command');
    assert.strictEqual(res.action, 'add', 'Action should be add');
    assert.strictEqual(res.item, 'Pepsi', 'Item should be Pepsi');
    assert.strictEqual(res.qty, 2, 'Qty should be 2 for rendu');
    assert.strictEqual(res.unitPriceEstimate, 40, 'Pepsi unit price should be 40');
    assert.strictEqual(res.totalEstimate, 80, 'Total should be 2 * 40 = 80');
    console.log('  ✅ "Rendu Pepsi add pannu" passed');
  }

  // Test 2: "3 biscuit add pannu" -> { action: 'add', item: 'Biscuit', qty: 3 }
  {
    const res = parser.parse('3 biscuit add pannu');
    assert.strictEqual(res.matched, true, 'Should match billing command');
    assert.strictEqual(res.action, 'add', 'Action should be add');
    assert.strictEqual(res.item, 'Biscuit', 'Item should be Biscuit');
    assert.strictEqual(res.qty, 3, 'Qty should be 3 from digit');
    assert.strictEqual(res.totalEstimate, 3 * (res.unitPriceEstimate || 20), 'Total calculated correctly');
    console.log('  ✅ "3 biscuit add pannu" passed');
  }

  // Test 3: "remove Pepsi" -> { action: 'remove', item: 'Pepsi' }
  {
    const res = parser.parse('remove Pepsi');
    assert.strictEqual(res.matched, true, 'Should match remove command');
    assert.strictEqual(res.action, 'remove', 'Action should be remove');
    assert.strictEqual(res.item, 'Pepsi', 'Item should be Pepsi');
    console.log('  ✅ "remove Pepsi" passed');
  }

  // Test 4: "bill podu" -> { action: 'total' }
  {
    const res = parser.parse('bill podu');
    assert.strictEqual(res.matched, true, 'Should match total command');
    assert.strictEqual(res.action, 'total', 'Action should be total');
    console.log('  ✅ "bill podu" passed');
  }

  // Test 5: "total evlo" -> { action: 'total' }
  {
    const res = parser.parse('total evlo');
    assert.strictEqual(res.matched, true, 'Should match total command');
    assert.strictEqual(res.action, 'total', 'Action should be total');
    console.log('  ✅ "total evlo" passed');
  }

  // Test 6: Tamil spoken numerals: oru (1), moonu (3), naalu (4), anju (5)
  {
    const res1 = parser.parse('Oru vanilla cake add pannu');
    assert.strictEqual(res1.action, 'add');
    assert.strictEqual(res1.item, 'Vanilla Cake');
    assert.strictEqual(res1.qty, 1);

    const res3 = parser.parse('Moonu water bottle podu');
    assert.strictEqual(res3.action, 'add');
    assert.strictEqual(res3.item, 'Water Bottle');
    assert.strictEqual(res3.qty, 3);

    const res4 = parser.parse('Naalu samosa kudu');
    assert.strictEqual(res4.action, 'add');
    assert.strictEqual(res4.item, 'Samosa');
    assert.strictEqual(res4.qty, 4);

    const res5 = parser.parse('Anju egg puffs add pannu');
    assert.strictEqual(res5.action, 'add');
    assert.strictEqual(res5.item, 'Egg Puffs');
    assert.strictEqual(res5.qty, 5);

    console.log('  ✅ Tamil spoken numerals (oru, moonu, naalu, anju) passed');
  }

  // Test 7: Tamil script commands: "இரண்டு டீ போடு"
  {
    const res = parser.parse('இரண்டு டீ போடு');
    assert.strictEqual(res.matched, true, 'Should match Tamil script billing command');
    assert.strictEqual(res.action, 'add');
    assert.strictEqual(res.qty, 2, 'Should parse இரண்டு as 2');
    console.log('  ✅ Tamil script "இரண்டு டீ போடு" passed');
  }

  // Test 8: Follow-up quantity command: "Innum rendu venum"
  {
    const res = parser.parse('Innum rendu venum');
    assert.strictEqual(res.matched, true, 'Should match follow-up add');
    assert.strictEqual(res.action, 'add');
    assert.strictEqual(res.qty, 2, 'Quantity should be 2');
    console.log('  ✅ Follow-up "Innum rendu venum" passed');
  }

  // Test 9: Fall back to LLM for non-billing inputs
  {
    const nonBillingQueries = [
      'Tiyo, tea kudichiya?',
      'Nalla joke sollu',
      'Innaiku business nalla pogudha?',
      'What is the weather outside?',
      'Tell me about small language models',
    ];

    for (const query of nonBillingQueries) {
      const res = parser.parse(query);
      assert.strictEqual(
        res.matched,
        false,
        `"${query}" should NOT match deterministic parser (must fall back to LLM)`
      );
    }
    console.log('  ✅ Non-billing conversational fallback to LLM passed');
  }

  console.log('--- All BillingParserService tests PASSED ---\n');
}
