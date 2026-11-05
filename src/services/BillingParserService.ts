export interface ParsedBillingCommand {
  matched: boolean;
  action: 'add' | 'remove' | 'total' | 'clear' | 'query_stock' | 'unknown';
  item?: string;
  qty?: number;
  unitPriceEstimate?: number;
  totalEstimate?: number;
  rawInput: string;
}

// Comprehensive spoken & written Tamil numerals mapping
export const TAMIL_NUMERALS: Record<string, number> = {
  // 1
  oru: 1,
  onnu: 1,
  onru: 1,
  one: 1,
  '1': 1,
  'ஒரு': 1,
  'ஒன்று': 1,
  'ஒன்னு': 1,
  // 2
  rendu: 2,
  erandu: 2,
  irandu: 2,
  two: 2,
  '2': 2,
  'இரண்டு': 2,
  'ரெண்டு': 2,
  // 3
  moonu: 3,
  moondru: 3,
  three: 3,
  '3': 3,
  'மூன்று': 3,
  'மூணு': 3,
  // 4
  naalu: 4,
  naangu: 4,
  four: 4,
  '4': 4,
  'நான்கு': 4,
  'நாலு': 4,
  // 5
  anju: 5,
  ainthu: 5,
  five: 5,
  '5': 5,
  'ஐந்து': 5,
  'அஞ்சு': 5,
  // 6
  aaru: 6,
  six: 6,
  '6': 6,
  'ஆறு': 6,
  // 7
  ezhu: 7,
  seven: 7,
  '7': 7,
  'ஏழு': 7,
  // 8
  ettu: 8,
  eight: 8,
  '8': 8,
  'எட்டு': 8,
  // 9
  ombodhu: 9,
  onbadhu: 9,
  nine: 9,
  '9': 9,
  'ஒன்பது': 9,
  // 10
  pathu: 10,
  ten: 10,
  '10': 10,
  'பத்து': 10,
};

// Known price database for standard edge retail/bistro items
export const STANDARD_ITEM_PRICES: Record<string, number> = {
  pepsi: 40,
  coke: 40,
  'coca cola': 40,
  biscuit: 20,
  biscuits: 20,
  tea: 15,
  chai: 15,
  coffee: 25,
  'egg puff': 25,
  'egg puffs': 25,
  puff: 20,
  puffs: 20,
  'vanilla cake': 50,
  cake: 40,
  samosa: 15,
  'water bottle': 20,
  water: 20,
  chips: 10,
  bun: 15,
  bread: 35,
  milk: 30,
};

export class BillingParserService {
  private static instance: BillingParserService;

  private constructor() {}

  public static getInstance(): BillingParserService {
    if (!BillingParserService.instance) {
      BillingParserService.instance = new BillingParserService();
    }
    return BillingParserService.instance;
  }

  /**
   * Deterministically parses shop billing and inventory commands in English, Tamil, and Tanglish.
   */
  public parse(input: string): ParsedBillingCommand {
    const raw = (input || '').trim();
    if (!raw) {
      return { matched: false, action: 'unknown', rawInput: raw };
    }

    const lower = raw.toLowerCase();

    // 1. Total / Bill Commands
    // Examples: "bill podu", "total evlo", "total evvalavu", "total please", "what is the total", "மொத்தம் எவ்வளவு"
    const isTotalCommand =
      lower.includes('total evlo') ||
      lower.includes('total evvalavu') ||
      lower.includes('bill podu') ||
      lower.includes('bill potu') ||
      lower.includes('bill podunga') ||
      lower.includes('bill total') ||
      lower.includes('total please') ||
      lower.includes('what is the total') ||
      lower.includes('what is my total') ||
      lower.includes('evlo aachu') ||
      lower.includes('evlo aagudhu') ||
      lower.includes('மொத்தம் எவ்வளவு') ||
      lower.includes('பில் போடு') ||
      lower.trim() === 'total' ||
      lower.trim() === 'bill';

    if (isTotalCommand) {
      return { matched: true, action: 'total', rawInput: raw };
    }

    // 2. Clear / Reset Bill Commands
    const isClearCommand =
      lower.includes('bill cancel') ||
      lower.includes('clear cart') ||
      lower.includes('cancel bill') ||
      lower.includes('reset bill') ||
      lower.includes('cart-a clear pannu');

    if (isClearCommand) {
      return { matched: true, action: 'clear', rawInput: raw };
    }

    // 3. Stock / Inventory Query Commands
    const isStockQuery =
      lower.includes('stock kammi') ||
      lower.includes('stock check') ||
      lower.includes('low stock') ||
      lower.includes('inventory check');

    if (isStockQuery) {
      return { matched: true, action: 'query_stock', rawInput: raw };
    }

    // 4. Remove / Delete Item Commands
    // Examples: "remove Pepsi", "delete Coke", "Pepsi eduthudu", "biscuit vendaam", "pepsi cancel pannu"
    const isRemoveCommand =
      lower.includes('remove') ||
      lower.includes('delete') ||
      lower.includes('eduthudu') ||
      lower.includes('vendaam') ||
      lower.includes('vendam') ||
      lower.includes('neekku') ||
      lower.includes('நீக்கு');

    if (isRemoveCommand) {
      let cleanedItem = lower
        .replace(/\b(remove|delete|cancel|eduthudu|vendaam|vendam|neekku|pannu|iru|please|item)\b/gi, '')
        .replace(/[\u0B80-\u0BFF]+/g, (match) => (match === 'நீக்கு' ? '' : match))
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
        .trim();

      if (cleanedItem) {
        cleanedItem = this.formatItemName(cleanedItem);
        return {
          matched: true,
          action: 'remove',
          item: cleanedItem,
          rawInput: raw,
        };
      }
    }

    // 5. Add / Order Item Commands
    // Examples:
    // - "Rendu Pepsi add pannu"
    // - "3 biscuit add pannu"
    // - "Oru vanilla cake add pannu"
    // - "Innum rendu venum" (follow-up add)
    // - "Egg puffs-um add pannu"
    // - "Add 2 coke"
    // - "இரண்டு டீ போடு"
    const isAddCommand =
      lower.includes('add') ||
      lower.includes('pannu') ||
      lower.includes('kodu') ||
      lower.includes('kudu') ||
      lower.includes('kodunga') ||
      lower.includes('kudunga') ||
      lower.includes('podu') ||
      lower.includes('podunga') ||
      lower.includes('venum') ||
      lower.includes('order') ||
      lower.includes('சேர்') ||
      lower.includes('போடு') ||
      lower.includes('கொடு') ||
      lower.includes('வேண்டும்');

    if (isAddCommand) {
      let quantity = 1;
      let matchedQty = false;

      // Check numeric digits first: e.g. "3 biscuit add pannu", "add 2 coke"
      const digitMatch = lower.match(/\b(\d+)\b/);
      if (digitMatch) {
        quantity = parseInt(digitMatch[1], 10);
        matchedQty = true;
      } else {
        // Check Tamil numeral words: "rendu", "moonu", "oru", etc.
        for (const [word, val] of Object.entries(TAMIL_NUMERALS)) {
          // Word boundary or standalone
          const regex = new RegExp(`(^|\\s)${word}(\\s|$)`, 'i');
          if (regex.test(lower)) {
            quantity = val;
            matchedQty = true;
            break;
          }
        }
      }

      // Check for follow-up add without explicit item: e.g. "Innum rendu venum", "add one more"
      const isFollowUpAdd =
        lower.includes('innum') ||
        lower.includes('one more') ||
        lower.includes('another') ||
        lower.includes('extra');

      // Extract item name
      let cleanedItem = lower;
      // Strip operational command words
      const removeWords = [
        'add', 'pannu', 'panu', 'pannunga', 'kodu', 'kodunga', 'kudu', 'kudunga', 'podu', 'podunga',
        'venum', 'veendum', 'order', 'please', 'seri', 'okay', 'innum', 'um',
        'சேர்', 'போடு', 'கொடு', 'வேண்டும்', 'இன்னும்'
      ];
      for (const rw of removeWords) {
        cleanedItem = cleanedItem.replace(new RegExp(`(^|\\s)${rw}(\\s|$)`, 'gi'), ' ');
      }

      // Strip Tamil number words
      for (const numWord of Object.keys(TAMIL_NUMERALS)) {
        cleanedItem = cleanedItem.replace(new RegExp(`(^|\\s)${numWord}(\\s|$)`, 'gi'), ' ');
      }

      // Clean digits & symbols
      cleanedItem = cleanedItem
        .replace(/\b\d+\b/g, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Handle "-um" suffix in Tanglish (e.g. "egg puffs-um" -> "egg puffs")
      cleanedItem = cleanedItem.replace(/-?um$/i, '').trim();

      if (cleanedItem.length >= 2) {
        const formattedItem = this.formatItemName(cleanedItem);
        const lowerItemKey = cleanedItem.toLowerCase();
        const unitPrice = STANDARD_ITEM_PRICES[lowerItemKey] || 30;

        return {
          matched: true,
          action: 'add',
          item: formattedItem,
          qty: quantity,
          unitPriceEstimate: unitPrice,
          totalEstimate: unitPrice * quantity,
          rawInput: raw,
        };
      } else if (isFollowUpAdd && matchedQty) {
        // Follow-up quantity adjustment
        return {
          matched: true,
          action: 'add',
          qty: quantity,
          rawInput: raw,
        };
      }
    }

    // No deterministic billing match: signal engine to fall back to the LLM
    return {
      matched: false,
      action: 'unknown',
      rawInput: raw,
    };
  }

  private formatItemName(rawName: string): string {
    return rawName
      .split(' ')
      .filter((w) => w.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
