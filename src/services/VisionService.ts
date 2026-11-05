import { ChatAttachment } from '../models/modelTypes';

export interface VisionAnalysisResult {
  hasVisionContext: boolean;
  modelType: 'local-multimodal' | 'edge-vision-analyzer' | 'none';
  detectedCategory: 'unsupported' | 'general_image';
  summary: string;
  extractedDetails: {
    dimensions?: string;
    aspectRatio?: string;
    status: string;
  };
}

export class VisionService {
  private static instance: VisionService;

  private constructor() {}

  public static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  /**
   * Analyzes an uploaded image attachment honestly without fake heuristics or canned data.
   */
  public async analyzeImage(attachment: ChatAttachment, _userQuery: string = ''): Promise<VisionAnalysisResult> {
    const dims = attachment.dimensions
      ? `${attachment.dimensions.width}×${attachment.dimensions.height}`
      : 'Standard Resolution';

    const aspectRatio = attachment.dimensions
      ? (attachment.dimensions.width / attachment.dimensions.height).toFixed(2)
      : '1.0';

    return {
      hasVisionContext: false,
      modelType: 'none',
      detectedCategory: 'unsupported',
      summary: 'Image understanding not available yet. Visual inference requires multimodal vision weights (e.g., Qwen2-VL or MobileVLM mmproj) which are not loaded in this edge runtime.',
      extractedDetails: {
        dimensions: dims,
        aspectRatio,
        status: 'Image understanding not available yet',
      },
    };
  }

  /**
   * Does NOT inject fake OCR or hallucinated visual data into the language prompt.
   * Returns clean user prompt without fake vision hallucinations.
   */
  public buildVisionPrompt(userPrompt: string, _vision: VisionAnalysisResult, _attachment: ChatAttachment): string {
    // Hard Rule: Do NOT inject fake vision data into prompt.
    return userPrompt || 'Image attached. (Note: Image understanding not available yet)';
  }
}
