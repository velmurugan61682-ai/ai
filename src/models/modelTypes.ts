export interface DeviceHardwareInfo {
  manufacturer: string;
  modelName: string;
  deviceDesignName: string;
  androidVersion: string;
  apiLevel: number;
  totalPhysicalRAMBytes: number;
  totalPhysicalRAMGB: number;
  availableRAMBytes: number;
  availableRAMGB: number;
  cpuArchitecture: string;
  cpuCores: number;
  processorName: string;
  freeStorageBytes: number;
  freeStorageGB: number;
  totalStorageBytes: number;
  totalStorageGB: number;
  gpuCapabilities: string;
  batteryLevel: number; // 0 - 100%
  isCharging: boolean;
  batteryState: string;
  thermalStatus: string;
  isVirtualRamExcluded: boolean;
  timestamp: number;
}

export type RecommendationPreference = 'overall' | 'accuracy' | 'speed' | 'lowest-memory';

export interface AIModelMetadata {
  id: string;
  name: string;
  subtitle: string;
  family: 'Qwen' | 'Llama';
  repo?: string;
  repo?: string;
  parameters: string;
  quantization: string;
  fileSizeMB: number;
  downloadSizeMB: number;
  exactSizeBytes?: number;
  exactSizeBytes?: number;
  minPhysicalRAMGB: number;
  recommendedAvailableRAMGB: number;
  minStorageMB: number;
  contextWindow: number;
  speedRating: number; // 1 - 5
  accuracyRating: number; // 1 - 5
  memoryEfficiencyRating: number; // 1 - 5
  downloadUrl: string;
  fileName: string;
  sha256Checksum?: string;
  description: string;
  license: string;
  tags: string[];
  strengths: string[];
  recommendedFor: RecommendationPreference[];
}

export type ModelDownloadStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'paused'
  | 'downloaded'
  | 'verifying'
  | 'corrupted'
  | 'error';

export interface ModelRuntimeState {
  modelId: string;
  status: ModelDownloadStatus;
  downloadProgress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  localPath?: string;
  errorMessage?: string;
  downloadSpeedBps?: number;
}

export interface ModelRecommendation {
  model: AIModelMetadata;
  compatibilityScore: number; // 0 - 100
  isCompatible: boolean;
  incompatibilityReason?: string;
  recommendationReason: string;
  isTopPick: boolean;
}

export interface BenchmarkQuestion {
  id: string;
  language: 'English' | 'Tamil' | 'Tanglish';
  prompt: string;
  category: 'general' | 'reasoning' | 'inventory_billing' | 'speed_test';
  expectedKeywords?: string[];
}

export interface BenchmarkResult {
  id: string;
  modelId: string;
  modelName: string;
  timestamp: number;
  timeToFirstTokenMs: number;
  tokensPerSecond: number;
  totalResponseTimeMs: number;
  totalTokensGenerated: number;
  peakMemoryMB: number;
  stabilityScore: number; // 0 - 100
  taskSpecificAccuracy: number; // 0 - 100
  languageUnderstandingScores: {
    english: number; // 0 - 100
    tamil: number; // 0 - 100
    tanglish: number; // 0 - 100
  };
  batteryImpact: string;
  thermalStatus: string;
  testQuestionsCount: number;
  detailedAnswers?: {
    questionId: string;
    question: string;
    language: string;
    response: string;
    latencyMs: number;
    tps: number;
    accuracyScore: number;
  }[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  size: number; // in bytes
  mimeType: string;
  uri: string;
  base64?: string;
  extractedText?: string;
  previewUrl?: string;
  dimensions?: { width: number; height: number };
}

export interface PhotoEditRecord {
  originalUri: string;
  editedUri: string;
  prompt: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  modelName?: string;
  inferenceTimeMs?: number;
  tokensPerSecond?: number;
  structuredData?: BillingStructure | null;
  attachments?: ChatAttachment[];
  editedPhoto?: PhotoEditRecord;
}

export interface BillingItem {
  itemName: string;
  quantity: number;
  unit?: string;
  unitPriceEstimate?: number;
  totalEstimate?: number;
}

export interface BillingStructure {
  type: 'order_intent' | 'inventory_query' | 'general_info';
  action: 'add_to_cart' | 'view_inventory' | 'help';
  items: BillingItem[];
  rawTamilInput?: string;
  requiresConfirmation: boolean;
  validationStatus: 'VALIDATED_OFFLINE' | 'PENDING_APPROVAL';
  note: string;
}

