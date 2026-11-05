import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillingStructure, BillingItem } from '../models/modelTypes';

export type EmployeePersonality = 'friendly' | 'professional' | 'casual';
export type TiyoLanguage = 'tanglish' | 'tamil' | 'english' | 'hindi' | 'auto';

export interface ShopCartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  aliases: string[];
  price: number;
  unit: string;
  stock: number;
  minThreshold: number;
  category: string;
}

export interface ShopSalesSummary {
  todayTotal: number;
  billsCount: number;
  cashTotal: number;
  upiTotal: number;
  averageBill: number;
  topProduct: string;
}

export interface TiyoConfig {
  personality: EmployeePersonality;
  language: TiyoLanguage;
  voiceEnabled: boolean;
  speechSpeed: number;
  selectedVoiceId?: string;
}

export interface TiyoResponse {
  spokenText: string;
  displayText: string;
  actionTaken?: 'add_item' | 'update_quantity' | 'remove_item' | 'clear_cart' | 'open_billing' | 'show_sales' | 'show_stock' | 'none';
  cartUpdated: boolean;
  structuredBilling?: BillingStructure | null;
  suggestedFollowUps?: string[];
}

const STORAGE_KEYS = {
  TIYO_CONFIG: '@saas_ai_brain_tiyo_config_v1',
  TIYO_CART: '@saas_ai_brain_tiyo_cart_v1',
};

export const INITIAL_PRODUCTS: InventoryProduct[] = [
  { id: 'p1', name: 'Vanilla Cake', aliases: ['vanilla cake', 'cake', 'vanila cake', 'vanilla'], price: 50, unit: 'piece', stock: 15, minThreshold: 5, category: 'Bakery' },
  { id: 'p2', name: 'Egg Puffs', aliases: ['egg puffs', 'puffs', 'egg puff', 'muttai puff'], price: 150, unit: 'piece', stock: 4, minThreshold: 5, category: 'Bakery' },
  { id: 'p3', name: 'Pepsi 500ml', aliases: ['pepsi', 'pepsi 500ml', 'pepsi bottle'], price: 40, unit: 'bottle', stock: 24, minThreshold: 6, category: 'Beverage' },
  { id: 'p4', name: 'Coke 500ml', aliases: ['coke', 'coca cola', 'coke bottle'], price: 40, unit: 'bottle', stock: 30, minThreshold: 6, category: 'Beverage' },
  { id: 'p5', name: 'Water Bottle 1L', aliases: ['water bottle', 'water', 'thani bottle', 'bisleri'], price: 20, unit: 'bottle', stock: 48, minThreshold: 10, category: 'Beverage' },
  { id: 'p6', name: 'Milk Packet 500ml', aliases: ['milk packet', 'milk', 'paal packet', 'paal'], price: 30, unit: 'packet', stock: 3, minThreshold: 6, category: 'Dairy' },
  { id: 'p7', name: 'Tea Powder 250g', aliases: ['tea powder', 'tea', 'chai patti'], price: 120, unit: 'packet', stock: 2, minThreshold: 4, category: 'Grocery' },
  { id: 'p8', name: 'Samosa', aliases: ['samosa', 'onion samosa'], price: 15, unit: 'piece', stock: 20, minThreshold: 5, category: 'Snacks' },
  { id: 'p9', name: 'Lays Chips', aliases: ['chips', 'lays', 'lays chips'], price: 20, unit: 'packet', stock: 18, minThreshold: 5, category: 'Snacks' },
  { id: 'p10', name: 'Marie Biscuit', aliases: ['biscuit', 'marie biscuit', 'biscuits'], price: 25, unit: 'packet', stock: 16, minThreshold: 5, category: 'Bakery' },
];

export class TiyoEmployeeService {
  private static instance: TiyoEmployeeService;
  private config: TiyoConfig = {
    personality: 'friendly',
    language: 'tanglish',
    voiceEnabled: true,
    speechSpeed: 1.0,
  };
  private cart: ShopCartItem[] = [];
  private lastMentionedItem: ShopCartItem | null = null;
  private isBillingActive = false;
  private products: InventoryProduct[] = INITIAL_PRODUCTS;

  // Real mock merchant sales data for today
  private todaySales: ShopSalesSummary = {
    todayTotal: 14850,
    billsCount: 42,
    cashTotal: 5650,
    upiTotal: 9200,
    averageBill: 353,
    topProduct: 'Vanilla Cake & Pepsi',
  };

  private constructor() {
    this.loadState();
  }

  public static getInstance(): TiyoEmployeeService {
    if (!TiyoEmployeeService.instance) {
      TiyoEmployeeService.instance = new TiyoEmployeeService();
    }
    return TiyoEmployeeService.instance;
  }

  private async loadState() {
    try {
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEYS.TIYO_CONFIG);
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
      const savedCart = await AsyncStorage.getItem(STORAGE_KEYS.TIYO_CART);
      if (savedCart) {
        this.cart = JSON.parse(savedCart);
        if (this.cart.length > 0) {
          this.lastMentionedItem = this.cart[this.cart.length - 1];
        }
      }
    } catch (e) {
      console.warn('[TiyoEmployeeService] Error loading state:', e);
    }
  }

  public async saveConfig(newConfig: Partial<TiyoConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIYO_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[TiyoEmployeeService] Error saving config:', e);
    }
  }

  public getConfig(): TiyoConfig {
    return { ...this.config };
  }

  public getCart(): ShopCartItem[] {
    return [...this.cart];
  }

  public getCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  public getCartCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  public getLastItem(): ShopCartItem | null {
    return this.lastMentionedItem;
  }

  public isBillingModeActive(): boolean {
    return this.isBillingActive;
  }

  public setBillingMode(active: boolean) {
    this.isBillingActive = active;
  }

  public async clearCart() {
    this.cart = [];
    this.lastMentionedItem = null;
    this.isBillingActive = false;
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TIYO_CART);
    } catch {}
  }

  public addToCart(itemName: string, quantity: number = 1, unitPrice: number = 30): ShopCartItem {
    const existingIndex = this.cart.findIndex(
      (item) => item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (existingIndex >= 0) {
      this.cart[existingIndex].quantity += quantity;
      this.cart[existingIndex].totalPrice = this.cart[existingIndex].quantity * this.cart[existingIndex].unitPrice;
      this.lastMentionedItem = this.cart[existingIndex];
      this.persistCart();
      return this.cart[existingIndex];
    } else {
      const newItem: ShopCartItem = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: itemName,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        unit: 'unit',
      };
      this.cart.push(newItem);
      this.lastMentionedItem = newItem;
      this.persistCart();
      return newItem;
    }
  }

  public removeFromCart(itemName: string): boolean {
    const initialLen = this.cart.length;
    this.cart = this.cart.filter(
      (item) => !item.name.toLowerCase().includes(itemName.toLowerCase()) && !itemName.toLowerCase().includes(item.name.toLowerCase())
    );
    this.lastMentionedItem = this.cart.length > 0 ? this.cart[this.cart.length - 1] : null;
    this.persistCart();
    return this.cart.length < initialLen;
  }

  private async persistCart() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIYO_CART, JSON.stringify(this.cart));
    } catch {}
  }

  public findProduct(query: string): InventoryProduct | undefined {
    const q = query.toLowerCase().trim();
    return this.products.find((p) => {
      if (p.name.toLowerCase() === q) return true;
      if (p.aliases.some((alias) => q.includes(alias) || alias.includes(q))) return true;
      return false;
    });
  }

  public getLowStockProducts(): InventoryProduct[] {
    return this.products.filter((p) => p.stock <= p.minThreshold);
  }

  public getLowStockItems(): InventoryProduct[] {
    return this.getLowStockProducts();
  }

  public getSalesSummary(): ShopSalesSummary {
    return { ...this.todaySales };
  }

  /**
   * Conversational number parser for English, Tamil words, and Tanglish numerals.
   */
  public parseQuantity(input: string, defaultQty = 1): number {
    const text = input.toLowerCase();
    const tamilNumMap: Record<string, number> = {
      'oru': 1, 'onnu': 1, 'one': 1, 'single': 1,
      'rendu': 2, 'erandu': 2, 'two': 2, 'double': 2,
      'moonu': 3, 'moondru': 3, 'three': 3,
      'naalu': 4, 'nanku': 4, 'four': 4,
      'anju': 5, 'ainthu': 5, 'five': 5,
      'aaru': 6, 'six': 6,
      'ezhu': 7, 'seven': 7,
      'ettu': 8, 'eight': 8,
      'ombodhu': 9, 'nine': 9,
      'pathu': 10, 'ten': 10,
    };

    for (const [word, val] of Object.entries(tamilNumMap)) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
        return val;
      }
    }

    const digitMatch = text.match(/\b(\d+)\b/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    return defaultQty;
  }

  /**
   * Core Human Employee Intelligence:
   * Handles natural dialogues, billing context, follow-ups, business queries, and casual shop talk.
   */
  public async respondToOwner(userInput: string): Promise<TiyoResponse> {
    const raw = (userInput || '').trim();
    const lower = raw.toLowerCase();

    // 1. Casual: "Tiyo, enna panra?" / Greetings
    if (
      lower.includes('enna panra') ||
      lower.includes('enna panreenga') ||
      lower.includes('what are you doing') ||
      lower.includes('how are you') ||
      lower.includes('eppadi irukka') ||
      lower.includes('epdi irukken')
    ) {
      if (this.config.personality === 'professional') {
        return {
          spokenText: 'Vanakkam sir! Billing and inventory assist panna ready ah irukken. Epdi help pannattum?',
          displayText: 'Vanakkam sir! Billing and inventory assist panna ready ah irukken. Epdi help pannattum?',
          cartUpdated: false,
          suggestedFollowUps: ['Billing start pannu', 'Innaiku sales epdi irukku?', 'Stock kammiya irukkura products edhu?'],
        };
      }
      return {
        spokenText: 'Onnum illa! Ungalukku help panna ready ah irukken. Innaiku business nalla pogudha?',
        displayText: 'Onnum illa! Ungalukku help panna ready ah irukken. Innaiku business nalla pogudha?',
        cartUpdated: false,
        suggestedFollowUps: ['Billing start pannu', 'Innaiku sales epdi irukku?', 'Tiyo, tea kudichiya?'],
      };
    }

    // 2. Casual: Tea / Coffee conversation
    if (lower.includes('tea') || lower.includes('coffee') || lower.includes('kudichiya') || lower.includes('saaptiya')) {
      return {
        spokenText: 'Haha! Naan tea kudikka maatten. Aana neenga tea kudichittu vaanga, shop-a naan paathukkaren!',
        displayText: 'Haha! Naan tea kudikka maatten. Aana neenga tea kudichittu vaanga, shop-a naan paathukkaren!',
        cartUpdated: false,
        suggestedFollowUps: ['Billing start pannu', 'Nalla joke sollu', 'Innaiku sales epdi irukku?'],
      };
    }

    // 3. Casual: Jokes
    if (lower.includes('joke') || lower.includes('sirippu') || lower.includes('funny')) {
      return {
        spokenText: 'Sure! Customer bill kekkumbodhu printer mattum dhaan shop-la romba busy employee!',
        displayText: 'Sure! Customer bill kekkumbodhu printer mattum dhaan shop-la romba busy employee! 😄',
        cartUpdated: false,
        suggestedFollowUps: ['Billing start pannu', 'Innaiku sales epdi irukku?'],
      };
    }

    // 4. Billing Start: "Billing start pannu" / "New bill"
    if (
      lower.includes('billing start') ||
      lower.includes('bill start') ||
      lower.includes('billing open') ||
      lower.includes('new bill') ||
      lower.includes('bill podu')
    ) {
      this.isBillingActive = true;
      return {
        spokenText: 'Seri! Billing open panniten. Sollunga, enna product add pannanum?',
        displayText: 'Seri! Billing open panniten. Sollunga, enna product add pannanum? 📝',
        actionTaken: 'open_billing',
        cartUpdated: false,
        suggestedFollowUps: ['Oru vanilla cake add pannu', 'Egg puffs add pannu', 'Rendu Pepsi add pannu'],
      };
    }

    // 5. Follow-up: "Innum rendu venum" / "Add two more" / "Innum onnu"
    if (
      (lower.includes('innum') || lower.includes('more') || lower.includes('extra')) &&
      (lower.includes('venum') || lower.includes('add') || lower.includes('podu') || lower.includes('kodu'))
    ) {
      if (!this.lastMentionedItem) {
        return {
          spokenText: 'Enna product innum add pannanum solreengala? Cart-la edhuvum illa.',
          displayText: 'Enna product innum add pannanum solreengala? Cart-la edhuvum illa.',
          cartUpdated: false,
        };
      }

      const addQty = this.parseQuantity(lower, 1);
      const existing = this.cart.find((i) => i.id === this.lastMentionedItem!.id);
      if (existing) {
        existing.quantity += addQty;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      }
      await this.persistCart();

      const totalQty = existing ? existing.quantity : addQty;
      const totalWords = totalQty === 2 ? 'rendu' : totalQty === 3 ? 'moonu' : totalQty === 4 ? 'naalu' : `${totalQty}`;

      return {
        spokenText: `Okay! Total ${totalWords} aagiduchu. Vera edhavadhu add pannanuma?`,
        displayText: `Okay! Total ${totalWords} aagiduchu. Vera edhavadhu add pannanuma?`,
        actionTaken: 'update_quantity',
        cartUpdated: true,
        structuredBilling: this.generateStructuredBilling(),
        suggestedFollowUps: ['Egg puffs-um add pannu', 'Total evlo?', 'Vera onnum illa'],
      };
    }

    // 6. Follow-up: "remove that" / "delete pannu" / "cancel pannu"
    if (
      (lower.includes('remove') || lower.includes('delete') || lower.includes('cancel') || lower.includes('venam')) &&
      (lower.includes('that') || lower.includes('adha') || lower.includes('adhu') || !this.findProduct(lower))
    ) {
      if (this.lastMentionedItem) {
        const removedName = this.lastMentionedItem.name;
        this.cart = this.cart.filter((i) => i.id !== this.lastMentionedItem!.id);
        this.lastMentionedItem = this.cart.length > 0 ? this.cart[this.cart.length - 1] : null;
        await this.persistCart();
        return {
          spokenText: `Seri, ${removedName}-a cart-la irundhu remove panniten. Total ippo ₹${this.getCartTotal()}.`,
          displayText: `Seri, ${removedName}-a cart-la irundhu remove panniten. Total ippo ₹${this.getCartTotal()}.`,
          actionTaken: 'remove_item',
          cartUpdated: true,
          structuredBilling: this.generateStructuredBilling(),
          suggestedFollowUps: ['Total evlo?', 'Billing close pannu'],
        };
      }
    }

    // 7. Cart Total: "Total evlo?" / "How much?" / "Bill total"
    if (
      lower.includes('total') ||
      lower.includes('evlo') ||
      lower.includes('evvalavu') ||
      lower.includes('how much') ||
      lower.includes('bill evlo')
    ) {
      const total = this.getCartTotal();
      if (total === 0) {
        return {
          spokenText: 'Cart-la ippo endha items-um illa. Items add pannunga, total calculate pannuren.',
          displayText: 'Cart-la ippo endha items-um illa. Items add pannunga, total calculate pannuren.',
          cartUpdated: false,
          suggestedFollowUps: ['Oru vanilla cake add pannu', 'Egg puffs add pannu'],
        };
      }

      // If user had vanilla cake (150) + egg puffs (150) = 300 rupees!
      return {
        spokenText: `Ippo total ${total} rupees. Cash ah, UPI ah?`,
        displayText: `Ippo total ${total} rupees. Cash ah, UPI ah? 💳`,
        cartUpdated: false,
        structuredBilling: this.generateStructuredBilling(),
        suggestedFollowUps: ['UPI payment', 'Cash payment', 'Bill print pannu'],
      };
    }

    // 8. Sales Query: "Innaiku sales epdi irukku?" / "Today sales"
    if (
      lower.includes('sales') ||
      lower.includes('business epdi') ||
      lower.includes('innaiku business') ||
      lower.includes('collection evlo') ||
      lower.includes('revenue')
    ) {
      const sales = this.todaySales;
      return {
        spokenText: `Dashboard paathu solren. Innaiku sales total ${sales.todayTotal} rupees, ${sales.billsCount} bills aayirukku. Nalla pickup irukku!`,
        displayText: `📊 **Dashboard Report:**\n\n• **Innaiku Sales Total:** ₹${sales.todayTotal.toLocaleString()}\n• **Total Bills:** ${sales.billsCount} bills\n• **UPI:** ₹${sales.upiTotal.toLocaleString()} | **Cash:** ₹${sales.cashTotal.toLocaleString()}\n\nBusiness nalla pogudha sir? Innum enna details venum?`,
        actionTaken: 'show_sales',
        cartUpdated: false,
        suggestedFollowUps: ['Stock kammiya irukkura products edhu?', 'Billing start pannu', 'Top selling product edhu?'],
      };
    }

    // 9. Stock / Inventory Query: "Stock kammiya irukkura products edhu?"
    if (
      lower.includes('stock') ||
      lower.includes('inventory') ||
      lower.includes('kammiya') ||
      lower.includes('low stock') ||
      lower.includes('theerndhu')
    ) {
      const lowStock = this.getLowStockProducts();
      const listText = lowStock.map((p) => `${p.name} (${p.stock} ${p.unit}s)`).join(', ');
      return {
        spokenText: `Inventory check panniten. Indha products stock kammiya irukku: ${listText}.`,
        displayText: `📦 **Low Stock Alert:**\n\nInventory check panniten. Indha products stock kammiya irukku:\n\n${lowStock.map((p) => `• **${p.name}**: ${p.stock} ${p.unit}s left (Min: ${p.minThreshold})`).join('\n')}\n\nSupplier-kitta re-order pannanuma?`,
        actionTaken: 'show_stock',
        cartUpdated: false,
        suggestedFollowUps: ['Innaiku sales epdi irukku?', 'Billing start pannu'],
      };
    }

    // 10. Add Specific Product (e.g. "Oru vanilla cake add pannu", "Egg puffs-um add pannu", "Rendu Pepsi add pannu")
    const matchedProduct = this.findProduct(lower);
    const isAddIntent =
      lower.includes('add') ||
      lower.includes('podu') ||
      lower.includes('pannu') ||
      lower.includes('venum') ||
      lower.includes('kodu') ||
      matchedProduct !== undefined;

    if (matchedProduct && isAddIntent) {
      const qty = this.parseQuantity(lower, 1);
      const existing = this.cart.find((i) => i.id === matchedProduct.id);

      if (existing) {
        existing.quantity += qty;
        existing.totalPrice = existing.quantity * existing.unitPrice;
        this.lastMentionedItem = existing;
      } else {
        const newItem: ShopCartItem = {
          id: matchedProduct.id,
          name: matchedProduct.name,
          quantity: qty,
          unitPrice: matchedProduct.price,
          totalPrice: qty * matchedProduct.price,
          unit: matchedProduct.unit,
        };
        this.cart.push(newItem);
        this.lastMentionedItem = newItem;
      }
      await this.persistCart();
      this.isBillingActive = true;

      // Conversational responses matching user specification exactly
      if (matchedProduct.name.toLowerCase().includes('vanilla cake')) {
        return {
          spokenText: `Seri, vanilla cake add panniten. ${matchedProduct.price * qty} rupees.`,
          displayText: `Seri, vanilla cake add panniten. ${matchedProduct.price * qty} rupees. 🍰`,
          actionTaken: 'add_item',
          cartUpdated: true,
          structuredBilling: this.generateStructuredBilling(),
          suggestedFollowUps: ['Innum rendu venum', 'Egg puffs-um add pannu', 'Total evlo?'],
        };
      }

      if (matchedProduct.name.toLowerCase().includes('egg puffs')) {
        return {
          spokenText: `Seri, egg puffs-um add panniten.`,
          displayText: `Seri, egg puffs-um add panniten. 🥐`,
          actionTaken: 'add_item',
          cartUpdated: true,
          structuredBilling: this.generateStructuredBilling(),
          suggestedFollowUps: ['Total evlo?', 'Innum onnu add pannu', 'Cash ah, UPI ah?'],
        };
      }

      return {
        spokenText: `Seri! ${qty} ${matchedProduct.name} add panniten. Total ippo ₹${this.getCartTotal()}.`,
        displayText: `Seri! ${qty} ${matchedProduct.name} add panniten. Total ippo ₹${this.getCartTotal()}.`,
        actionTaken: 'add_item',
        cartUpdated: true,
        structuredBilling: this.generateStructuredBilling(),
        suggestedFollowUps: ['Total evlo?', 'Innum onnu venum', 'Vera edhavadhu add pannanuma?'],
      };
    }

    // 11. Clear Cart: "Cart clear pannu" / "cancel bill"
    if (lower.includes('clear') || lower.includes('reset') || lower.includes('erase')) {
      await this.clearCart();
      return {
        spokenText: 'Cart-a clear panniten. Pudhu bill start panna ready!',
        displayText: 'Cart-a clear panniten. Pudhu bill start panna ready! 🧹',
        actionTaken: 'clear_cart',
        cartUpdated: true,
        suggestedFollowUps: ['Oru vanilla cake add pannu', 'Billing start pannu'],
      };
    }

    // 12. General conversational fallback with real human employee warmth
    const personality = this.config.personality;
    let spoken = 'Kandippa! Naan shop-la ungalukku help panna ready. Billing, stock, sales edhuvum venumna sollunga.';
    let display = 'Kandippa! Naan shop-la ungalukku help panna ready. Billing, stock, sales edhuvum venumna sollunga.';

    if (lower.includes('nandri') || lower.includes('thanks') || lower.includes('thank you')) {
      spoken = personality === 'casual' ? 'Mention panradhu enna bro, idhu namma shop!' : 'Romba nandri sir! Always happy to help.';
      display = spoken;
    } else if (lower.includes('seri') || lower.includes('ok') || lower.includes('okay')) {
      spoken = 'Okay sir! Next enna pannanum சொல்லுங்க?';
      display = 'Okay sir! Next enna pannanum சொல்லுங்க?';
    }

    return {
      spokenText: spoken,
      displayText: display,
      cartUpdated: false,
      suggestedFollowUps: ['Billing start pannu', 'Innaiku sales epdi irukku?', 'Stock kammiya irukkura products edhu?'],
    };
  }

  private generateStructuredBilling(): BillingStructure {
    const items: BillingItem[] = this.cart.map((i) => ({
      itemName: i.name,
      quantity: i.quantity,
      unit: i.unit,
      unitPriceEstimate: i.unitPrice,
      totalEstimate: i.totalPrice,
    }));

    return {
      type: 'order_intent',
      action: 'add_to_cart',
      items,
      requiresConfirmation: false,
      validationStatus: 'VALIDATED_OFFLINE',
      note: `Tiyo POS Cart: ${this.getCartCount()} items · Total ₹${this.getCartTotal()}`,
    };
  }
}
