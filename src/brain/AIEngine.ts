import { Platform } from 'react-native';
import { BillingStructure, ChatMessage, ChatAttachment, PhotoEditRecord } from '../models/modelTypes';
import { getModelById } from '../models/modelRegistry';
import { LanguageService } from '../services/LanguageService';
import { ModelStorage } from '../storage/ModelStorage';
import { PhotoEditingService } from '../services/PhotoEditingService';
import { VisionService } from '../services/VisionService';
import { TiyoEmployeeService } from '../services/TiyoEmployeeService';
import {
  buildChatMLPrompt,
  stripThinkingTags,
  ThinkingStreamFilter,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_OUTPUT_TOKENS,
  QWEN_STOP_STRINGS,
} from './PromptEngine';
import { BillingParserService, ParsedBillingCommand } from '../services/BillingParserService';

// Dynamically require llama.rn on native platforms while remaining safe in web/bundler contexts
let llamaRnModule: any = null;
if (Platform.OS !== 'web') {
  try {
    llamaRnModule = require('llama.rn');
  } catch (e) {
    console.warn('[AIEngine] llama.rn native module not linked or available:', e);
  }
}

export interface InferenceMetrics {
  timeToFirstTokenMs: number;
  tokensPerSecond: number;
  totalTimeMs: number;
  totalTokens: number;
}

export type TokenCallback = (token: string) => void;

export class AIEngine {
  private static instance: AIEngine;
  private currentContext: any = null;
  private currentModelId: string | null = null;
  private isGenerating = false;

  private constructor() {}

  public static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  public getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  public isModelLoaded(): boolean {
    return this.currentContext !== null && !this.currentContext?.stub;
  }

  /**
   * Ensures that the requested model is downloaded and loaded into native llama.rn context.
   * Throws a clear user-visible error if the model is not downloaded.
   */
  public async ensureModelLoaded(modelId: string = 'qwen3-0.6b'): Promise<boolean> {
    if (this.currentModelId === modelId && this.currentContext && !this.currentContext.stub) {
      return true;
    }

    const modelMeta = getModelById(modelId);
    if (!modelMeta) {
      throw new Error(`Model "${modelId}" is not registered in the model catalog.`);
    }

    const storage = ModelStorage.getInstance();
    const modelFilePath = storage.getModelPath(modelMeta.fileName);

    console.log(`[AIEngine] Ensuring model "${modelMeta.name}" is loaded into memory.`);

    // Native Android platform
    if (Platform.OS === 'android') {
      if (!llamaRnModule || typeof llamaRnModule.initLlama !== 'function') {
        throw new Error(
          'Native llama.rn inference module is not linked or unavailable in this Android build.'
        );
      }

      const isDownloaded = await storage.isModelFilePresent(modelMeta.fileName);
      if (!isDownloaded) {
        throw new Error(
          `Model "${modelMeta.name}" is not downloaded to device storage. Please download it first from the Models tab.`
        );
      }

      console.log(`[AIEngine] Verified GGUF file exists on device. Initializing native llama.rn context...`);
      return await this.loadModel(modelId, modelFilePath);
    }

    // Web / non-Android platforms (Demo mode)
    if (Platform.OS === 'web') {
      console.log('[AIEngine] Running in web platform mode (Demo mode).');
      if (!this.currentContext || this.currentModelId !== modelId) {
        this.currentContext = { stub: true, modelId, modelFilePath };
        this.currentModelId = modelId;
      }
      return true;
    }

    if (!this.currentContext || this.currentModelId !== modelId) {
      this.currentContext = { stub: true, modelId, modelFilePath };
      this.currentModelId = modelId;
    }
    return true;
  }

  /**
   * Initializes and loads the GGUF model into native llama.cpp context.
   * Sets n_ctx to 4096 as specified.
   */
  public async loadModel(modelId: string, modelFilePath: string): Promise<boolean> {
    try {
      if (this.currentModelId === modelId && this.currentContext && !this.currentContext.stub) {
        console.log(`[AIEngine] Model "${modelId}" is already active and loaded in memory.`);
        return true;
      }

      console.log(`[AIEngine] Unloading previous model context before loading ${modelId}...`);
      await this.unloadCurrentModel();

      const modelMeta = getModelById(modelId);
      const contextSize = modelMeta?.contextWindow || DEFAULT_CONTEXT_WINDOW; // 4096

      if (llamaRnModule && typeof llamaRnModule.initLlama === 'function') {
        console.log(`[AIEngine] Calling llama.rn initLlama for ${modelId} (${modelMeta?.name || ''})...`);
        console.log(`[AIEngine] Config: model="${modelFilePath}", n_ctx=${contextSize}, use_mlock=false`);

        // First attempt: GPU layer offloading (Adreno OpenCL / Mali)
        try {
          this.currentContext = await llamaRnModule.initLlama({
            model: modelFilePath,
            n_ctx: contextSize,
            n_gpu_layers: 99,
            use_mlock: false,
          });
          console.log(
            `[AIEngine] ✅ Native llama.rn context loaded! ID: ${this.currentContext?.id}, GPU: ${this.currentContext?.gpu}`
          );
        } catch (gpuError: any) {
          console.warn(`[AIEngine] GPU init failed (${gpuError?.message}), falling back to CPU inference...`);
          this.currentContext = await llamaRnModule.initLlama({
            model: modelFilePath,
            n_ctx: contextSize,
            n_gpu_layers: 0,
            use_mlock: false,
          });
          console.log(`[AIEngine] ✅ Native llama.rn CPU context loaded! ID: ${this.currentContext?.id}`);
        }
      } else {
        if (Platform.OS === 'android') {
          throw new Error('Native llama.rn module is not linked in this Android build.');
        }
        this.currentContext = { stub: true, modelId, modelFilePath };
      }

      this.currentModelId = modelId;
      return true;
    } catch (error: any) {
      console.error('[AIEngine] ❌ Error loading model into memory:', error);
      await this.unloadCurrentModel();
      throw error;
    }
  }

  /**
   * Releases all native C++ memory held by the current model.
   */
  public async unloadCurrentModel(): Promise<void> {
    if (this.currentContext) {
      try {
        if (typeof this.currentContext.release === 'function') {
          console.log(`[AIEngine] Releasing native llama context ID: ${this.currentContext.id}`);
          await this.currentContext.release();
        }
      } catch (err) {
        console.warn('[AIEngine] Error releasing llama context:', err);
      }
      this.currentContext = null;
      this.currentModelId = null;
    }
  }

  /**
   * Runs local inference on the loaded Qwen model offline with conversation history.
   * - Enforces /no_think in ChatML system prompt.
   * - Strips any <think>...</think> blocks from stream and final text.
   * - Token budgets history within 4096 context.
   * - Deterministic billing commands work reliably; falls back to LLM.
   */
  public async generateCompletion(
    userPrompt: string,
    conversationHistory: ChatMessage[] = [],
    onToken?: TokenCallback,
    customSystemPrompt?: string,
    attachments: ChatAttachment[] = []
  ): Promise<{
    text: string;
    metrics: InferenceMetrics;
    structuredData: BillingStructure | null;
    editedPhoto?: PhotoEditRecord;
  }> {
    if (this.isGenerating) {
      throw new Error('Inference is currently active. Please wait for the current response to finish.');
    }

    // Verify native context is loaded on Android - clear, user-visible error
    if (Platform.OS === 'android') {
      if (!this.currentContext || this.currentContext.stub || typeof this.currentContext.completion !== 'function') {
        throw new Error(
          `Model "${this.currentModelId || 'Qwen3 0.6B'}" is not loaded in memory. Please ensure the model file is downloaded and tap to activate.`
        );
      }
    }

    this.isGenerating = true;
    const startTime = Date.now();
    let firstTokenTime = 0;
    let tokenCount = 0;
    let fullResponse = '';

    const imageAttachments = (attachments || []).filter((a) => a.type === 'image');
    const documentAttachments = (attachments || []).filter((a) => a.type === 'document');

    const lowerPrompt = (userPrompt || '').toLowerCase().trim();
    const isPhotoEditIntent =
      imageAttachments.length > 0 &&
      (lowerPrompt.includes('background') ||
        lowerPrompt.includes('remove') ||
        lowerPrompt.includes('change') ||
        lowerPrompt.includes('blue') ||
        lowerPrompt.includes('beach') ||
        lowerPrompt.includes('cartoon') ||
        lowerPrompt.includes('bright') ||
        lowerPrompt.includes('professional') ||
        lowerPrompt.includes('light') ||
        lowerPrompt.includes('edit') ||
        lowerPrompt.includes('filter') ||
        lowerPrompt.includes('style'));

    // 1. AI Photo Editing Pipeline (genuine local canvas vector styling)
    if (isPhotoEditIntent) {
      try {
        const targetImg = imageAttachments[0];
        const editResult = await PhotoEditingService.getInstance().editPhoto({
          prompt: userPrompt || 'Apply professional photo styling',
          sourceUri: targetImg.uri,
          base64: targetImg.base64,
          onProgress: (pct, status) => {
            if (onToken) onToken(`\n[${pct}%] ${status}`);
          },
        });

        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const generatedText =
          `✨ **AI Photo Edit Complete!**\n\n` +
          `${editResult.summary}\n\n` +
          `• **Original**: ${targetImg.name || 'Uploaded Photo'}\n` +
          `• **Transformation**: "${userPrompt}"\n` +
          `• **Download**: Tap the "Download Edited Photo" button below to save the file.`;

        const approxTokens = Math.ceil(generatedText.length / 4);
        const tps = parseFloat(((approxTokens / (totalTimeMs / 1000))).toFixed(1));

        return {
          text: generatedText,
          metrics: {
            timeToFirstTokenMs: totalTimeMs,
            tokensPerSecond: tps,
            totalTimeMs,
            totalTokens: approxTokens,
          },
          structuredData: null,
          editedPhoto: editResult.record,
        };
      } finally {
        this.isGenerating = false;
      }
    }

    // 2. Multimodal Vision Handling - Honest messaging without prompt injection
    let effectiveUserPrompt = userPrompt;
    if (imageAttachments.length > 0) {
      const targetImg = imageAttachments[0];
      const visionAnalysis = await VisionService.getInstance().analyzeImage(targetImg, userPrompt);
      effectiveUserPrompt = VisionService.getInstance().buildVisionPrompt(userPrompt, visionAnalysis, targetImg);
    }

    // 3. Document Extraction Context
    if (documentAttachments.length > 0) {
      for (const doc of documentAttachments) {
        if (doc.extractedText) {
          effectiveUserPrompt += `\n\n[Attached Document: ${doc.name} (${doc.mimeType || 'Document'})]\n${doc.extractedText.slice(0, 3000)}\n`;
        }
      }
    }

    // 4. Deterministic Billing Command Parser (T6)
    // Common shop commands work reliably without depending on the LLM:
    // "Rendu Pepsi add pannu" -> {action: 'add', item: 'Pepsi', qty: 2}
    // "3 biscuit add pannu" -> {action: 'add', item: 'biscuit', qty: 3}
    // "remove Pepsi" -> {action: 'remove', item: 'Pepsi'}
    // "bill podu" / "total evlo" -> {action: 'total'}
    const billingParser = BillingParserService.getInstance();
    const parsedBilling = billingParser.parse(userPrompt || effectiveUserPrompt);

    const tiyo = TiyoEmployeeService.getInstance();

    if (parsedBilling.matched) {
      console.log(`[AIEngine] Deterministic billing command matched:`, parsedBilling);

      let deterministicResponseText = '';
      let structuredBilling: BillingStructure | null = null;

      if (parsedBilling.action === 'add' && parsedBilling.item) {
        const qty = parsedBilling.qty || 1;
        const price = parsedBilling.unitPriceEstimate || 30;
        tiyo.addToCart(parsedBilling.item, qty, price);
        const currentTotal = tiyo.getCartTotal();

        deterministicResponseText =
          `Seri! ${qty}x ${parsedBilling.item} add panniten. Rate: ₹${price * qty}. ` +
          `Ippo total ₹${currentTotal}. Vera edhavadhu add pannanuma?`;

        structuredBilling = {
          type: 'order_intent',
          action: 'add_to_cart',
          items: [
            {
              itemName: parsedBilling.item,
              quantity: qty,
              unit: 'unit',
              unitPriceEstimate: price,
              totalEstimate: price * qty,
            },
          ],
          rawTamilInput: userPrompt,
          requiresConfirmation: true,
          validationStatus: 'PENDING_APPROVAL',
          note: 'Deterministic billing parser match.',
        };
      } else if (parsedBilling.action === 'add' && !parsedBilling.item) {
        // Follow-up quantity adjustment: e.g. "Innum rendu venum"
        const lastItem = tiyo.getCart()[tiyo.getCart().length - 1];
        if (lastItem) {
          const addQty = parsedBilling.qty || 1;
          tiyo.addToCart(lastItem.name, addQty, lastItem.unitPrice);
          const currentTotal = tiyo.getCartTotal();
          deterministicResponseText =
            `Okay! Innum ${addQty}x ${lastItem.name} add panniten. Total ${lastItem.quantity + addQty} aagiduchu. ` +
            `Ippo cart total ₹${currentTotal}.`;
        } else {
          deterministicResponseText = `Sollunga, enna product add pannanum?`;
        }
      } else if (parsedBilling.action === 'remove' && parsedBilling.item) {
        tiyo.removeFromCart(parsedBilling.item);
        const currentTotal = tiyo.getCartTotal();
        deterministicResponseText =
          `Seri! ${parsedBilling.item} cart-la irundhu remove panniten. Ippo total ₹${currentTotal}.`;
      } else if (parsedBilling.action === 'total') {
        const currentTotal = tiyo.getCartTotal();
        const count = tiyo.getCartCount();
        if (count === 0) {
          deterministicResponseText = `Cart ippo empty-ah irukku. Enna product add pannanum?`;
        } else {
          deterministicResponseText = `Ippo total ₹${currentTotal} (${count} items). Cash ah, UPI ah?`;
        }
      } else if (parsedBilling.action === 'clear') {
        await tiyo.clearCart();
        deterministicResponseText = `Seri, bill clear panniten. Pudhu bill start pannalam!`;
      } else if (parsedBilling.action === 'query_stock') {
        const lowStock = tiyo.getLowStockItems();
        deterministicResponseText =
          `Inventory check panniten. Indha products stock kammiya irukku: ${lowStock.map((p: any) => `${p.name} (${p.stock} left)`).join(', ')}.`;
      }

      if (deterministicResponseText) {
        // Stream out response
        const words = deterministicResponseText.split(' ');
        tokenCount = words.length;
        firstTokenTime = Date.now();

        for (let i = 0; i < words.length; i++) {
          const word = (i === 0 ? '' : ' ') + words[i];
          fullResponse += word;
          if (onToken) onToken(word);
          await new Promise((r) => setTimeout(r, 10));
        }

        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const ttft = firstTokenTime - startTime;
        const tps = parseFloat(((tokenCount / (totalTimeMs / 1000))).toFixed(1));

        this.isGenerating = false;
        return {
          text: fullResponse,
          metrics: {
            timeToFirstTokenMs: ttft,
            tokensPerSecond: tps,
            totalTimeMs,
            totalTokens: tokenCount,
          },
          structuredData: structuredBilling,
        };
      }
    }

    // 5. Fallback to Local LLM (or Web Demo simulator)
    const langInfo = LanguageService.getInstance().detectLanguage(userPrompt || effectiveUserPrompt);
    const tiyoConfig = tiyo.getConfig();
    const activeCart = tiyo.getCart();
    const sales = tiyo.getSalesSummary();

    // Tiyo Human Employee System Prompt with /no_think
    const baseSystemPrompt =
      customSystemPrompt ||
      `You are Tiyo, a real, friendly, smart human shop employee working inside the user's shop (Billzzy Lite POS).
Personality: ${tiyoConfig.personality.toUpperCase()} SHOP EMPLOYEE.
Language Instructions:
- Answer naturally in the user's language (${langInfo.name}).
- Speak fluently in Tamil, Tanglish (Tamil in English alphabet), or English.
- You are a real human employee working beside the shop owner. NEVER say "As an AI" or sound like a robot.
- Speak in short, warm, confident sentences.
- Current active cart: ${tiyo.getCartCount()} items, Total ₹${tiyo.getCartTotal()}. Items: ${activeCart.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Empty'}.
- Today's shop sales: ₹${sales.todayTotal} (${sales.billsCount} bills).
- Help the owner with billing, inventory, checking sales, and friendly daily shop conversation.`;

    try {
      if (
        this.currentContext &&
        !this.currentContext.stub &&
        typeof this.currentContext.completion === 'function'
      ) {
        // T3: Build ChatML Prompt correctly with token budgeting (4096 context) & /no_think
        const { prompt: formattedPrompt } = buildChatMLPrompt(
          baseSystemPrompt,
          conversationHistory,
          effectiveUserPrompt,
          DEFAULT_MAX_OUTPUT_TOKENS,
          DEFAULT_CONTEXT_WINDOW
        );

        console.log(`[AIEngine] Submitting prompt to llama.rn native Qwen model (${this.currentModelId})...`);

        // T3: Streaming thinking stripper filter
        const thinkFilter = new ThinkingStreamFilter((filteredToken) => {
          if (tokenCount === 0) {
            firstTokenTime = Date.now();
          }
          tokenCount++;
          fullResponse += filteredToken;
          if (onToken) onToken(filteredToken);
        });

        const result = await this.currentContext.completion(
          {
            prompt: formattedPrompt,
            n_predict: DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: 0.7,
            top_p: 0.9,
            // T3: Stop tokens replace ["<|im_end|>", "<|endoftext|>"]. Removed 'user\n'.
            stop: QWEN_STOP_STRINGS,
          },
          (data: { token: string }) => {
            if (data?.token) {
              thinkFilter.processToken(data.token);
            }
          }
        );

        thinkFilter.flush();

        const rawResultText = result?.text || fullResponse;
        // Strip any residual <think> tags from final text
        fullResponse = stripThinkingTags(rawResultText)
          .replace(/<\|im_end\|>/g, '')
          .replace(/<\|endoftext\|>/g, '')
          .trim();

        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const ttft = firstTokenTime > 0 ? firstTokenTime - startTime : Math.min(60, totalTimeMs);
        const tps = totalTimeMs > 0 ? parseFloat(((tokenCount / (totalTimeMs / 1000))).toFixed(1)) : 0;

        console.log(
          `[AIEngine] ✅ Inference complete! Generated ${tokenCount} tokens in ${totalTimeMs}ms (${tps} tps, TTFT: ${ttft}ms).`
        );

        return {
          text: fullResponse,
          metrics: {
            timeToFirstTokenMs: ttft,
            tokensPerSecond: tps,
            totalTimeMs,
            totalTokens: tokenCount,
          },
          structuredData: null,
        };
      } else if (Platform.OS === 'web') {
        // Honest Web Demo Mode
        console.log(`[AIEngine] Web Demo Mode handling request for ${this.currentModelId || 'Qwen3 0.6B'}`);

        const tiyoResponse = await tiyo.respondToOwner(effectiveUserPrompt);
        const rawContent = tiyoResponse.displayText;
        const cleanContent = stripThinkingTags(rawContent);

        // Stream tokens realistically
        const words = cleanContent.split(' ');
        tokenCount = words.length;
        firstTokenTime = Date.now();

        for (let i = 0; i < words.length; i++) {
          const word = (i === 0 ? '' : ' ') + words[i];
          fullResponse += word;
          if (onToken) onToken(word);
          await new Promise((r) => setTimeout(r, 12));
        }

        const totalTimeMs = Math.max(1, Date.now() - startTime);
        const ttft = firstTokenTime - startTime;
        const tps = parseFloat(((tokenCount / (totalTimeMs / 1000))).toFixed(1));

        return {
          text: fullResponse,
          metrics: {
            timeToFirstTokenMs: ttft,
            tokensPerSecond: tps,
            totalTimeMs,
            totalTokens: tokenCount,
          },
          structuredData: tiyoResponse.structuredBilling ?? null,
        };
      } else {
        // Native llama.rn context missing on Android
        throw new Error(
          'Qwen3 model is not loaded in device memory. Please download the model and tap to activate before chatting.'
        );
      }
    } catch (err: any) {
      console.error('[AIEngine] ❌ Inference execution error:', err);
      throw new Error(err?.message || 'Inference engine failed');
    } finally {
      this.isGenerating = false;
    }
  }
}
