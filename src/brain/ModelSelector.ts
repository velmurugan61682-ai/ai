import { AIModelMetadata, ModelRuntimeState } from '../models/modelTypes';
import { INITIAL_AI_MODELS, getModelById } from '../models/modelRegistry';
import { ModelStorage } from '../storage/ModelStorage';
import { AIEngine } from './AIEngine';

export class ModelSelector {
  private static instance: ModelSelector;
  private storage: ModelStorage;
  private aiEngine: AIEngine;

  private constructor() {
    this.storage = ModelStorage.getInstance();
    this.aiEngine = AIEngine.getInstance();
  }

  public static getInstance(): ModelSelector {
    if (!ModelSelector.instance) {
      ModelSelector.instance = new ModelSelector();
    }
    return ModelSelector.instance;
  }

  public async getActiveModel(): Promise<AIModelMetadata | null> {
    const selectedId = await this.storage.getSelectedModelId();
    if (!selectedId) return null;
    return getModelById(selectedId) || null;
  }

  public async selectModel(modelId: string): Promise<boolean> {
    const model = getModelById(modelId);
    if (!model) throw new Error('Model not found in registry');

    const states = await this.storage.getModelStates();
    const state: ModelRuntimeState | undefined = states[modelId];

    if (!state || state.status !== 'downloaded' || !state.localPath) {
      throw new Error(`Model ${model.name} must be downloaded before selection.`);
    }

    // Load into AI engine
    await this.aiEngine.loadModel(modelId, state.localPath);
    await this.storage.setSelectedModelId(modelId);
    return true;
  }

  public async switchModel(modelId: string): Promise<boolean> {
    return this.selectModel(modelId);
  }

  public async unloadActiveModel(): Promise<void> {
    await this.aiEngine.unloadCurrentModel();
    await this.storage.setSelectedModelId(null);
  }
}

