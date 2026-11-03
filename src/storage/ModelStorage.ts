import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import {
  BenchmarkResult,
  ChatMessage,
  ModelRuntimeState,
  RecommendationPreference,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';

const STORAGE_KEYS = {
  MODEL_STATES: '@saas_ai_brain_model_states_v1',
  SELECTED_MODEL_ID: '@saas_ai_brain_selected_model_id_v1',
  USER_PREFERENCE: '@saas_ai_brain_preference_v1',
  BENCHMARK_RESULTS: '@saas_ai_brain_benchmarks_v1',
  CHAT_MESSAGES: '@saas_ai_brain_chat_history_v1',
  DARK_MODE: '@saas_ai_brain_dark_mode_v1',
};

export const MODEL_DIRECTORY = `${FileSystem.documentDirectory ?? ''}models/`;

export class ModelStorage {
  private static instance: ModelStorage;

  private constructor() {}

  public static getInstance(): ModelStorage {
    if (!ModelStorage.instance) {
      ModelStorage.instance = new ModelStorage();
    }
    return ModelStorage.instance;
  }

  public async ensureModelDirectory(): Promise<string> {
    if (Platform.OS === 'web') return '';
    try {
      const dirInfo = await FileSystem.getInfoAsync(MODEL_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MODEL_DIRECTORY, { intermediates: true });
      }
      return MODEL_DIRECTORY;
    } catch (e) {
      console.warn('Failed to ensure model directory:', e);
      return MODEL_DIRECTORY;
    }
  }

  public getModelPath(fileName: string): string {
    return `${MODEL_DIRECTORY}${fileName}`;
  }

  public async isModelFilePresent(fileName: string): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const filePath = this.getModelPath(fileName);
      const info = await FileSystem.getInfoAsync(filePath);
      return Boolean(info.exists);
    } catch {
      return false;
    }
  }

  public async getModelStates(): Promise<Record<string, ModelRuntimeState>> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MODEL_STATES);
      const states: Record<string, ModelRuntimeState> = json ? JSON.parse(json) : {};

      // On web browser, provide seamless model availability without native filesystem dependencies
      if (Platform.OS === 'web') {
        for (const model of INITIAL_AI_MODELS) {
          if (!states[model.id]) {
            states[model.id] = {
              modelId: model.id,
              status: 'downloaded',
              downloadProgress: 100,
              downloadedBytes: model.fileSizeMB * 1024 * 1024,
              totalBytes: model.fileSizeMB * 1024 * 1024,
            };
          }
        }
        return states;
      }

      // Sync with physical files on disk on Android/iOS
      await this.ensureModelDirectory();
      for (const model of INITIAL_AI_MODELS) {
        const expectedPath = this.getModelPath(model.fileName);
        const fileInfo = await FileSystem.getInfoAsync(expectedPath);

        if (!states[model.id]) {
          states[model.id] = {
            modelId: model.id,
            status: fileInfo.exists ? 'downloaded' : 'not_downloaded',
            downloadProgress: fileInfo.exists ? 100 : 0,
            downloadedBytes: fileInfo.exists ? (fileInfo.size ?? model.fileSizeMB * 1024 * 1024) : 0,
            totalBytes: model.fileSizeMB * 1024 * 1024,
            localPath: fileInfo.exists ? expectedPath : undefined,
          };
        } else if (fileInfo.exists) {
          states[model.id].status = 'downloaded';
          states[model.id].downloadProgress = 100;
          states[model.id].localPath = expectedPath;
          states[model.id].downloadedBytes = fileInfo.size ?? states[model.id].totalBytes;
        } else if (states[model.id].status === 'downloaded' && !fileInfo.exists) {
          states[model.id].status = 'not_downloaded';
          states[model.id].downloadProgress = 0;
          states[model.id].downloadedBytes = 0;
          states[model.id].localPath = undefined;
        }
      }

      await this.saveModelStates(states);
      return states;
    } catch (err) {
      console.error('Error fetching model states:', err);
      return {};
    }
  }

  public async saveModelStates(states: Record<string, ModelRuntimeState>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_STATES, JSON.stringify(states));
    } catch (err) {
      console.error('Error saving model states:', err);
    }
  }

  public async updateModelState(
    modelId: string,
    updates: Partial<ModelRuntimeState>
  ): Promise<ModelRuntimeState> {
    const states = await this.getModelStates();
    const current = states[modelId] || {
      modelId,
      status: 'not_downloaded',
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    };
    const updated: ModelRuntimeState = { ...current, ...updates };
    states[modelId] = updated;
    await this.saveModelStates(states);
    return updated;
  }

  public async deleteModelFile(modelId: string, fileName: string): Promise<boolean> {
    try {
      const path = this.getModelPath(fileName);
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }

      await this.updateModelState(modelId, {
        status: 'not_downloaded',
        downloadProgress: 0,
        downloadedBytes: 0,
        localPath: undefined,
        errorMessage: undefined,
      });

      const selected = await this.getSelectedModelId();
      if (selected === modelId) {
        await this.setSelectedModelId(null);
      }

      return true;
    } catch (e) {
      console.error('Failed to delete model file:', e);
      return false;
    }
  }

  public async getSelectedModelId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MODEL_ID);
    } catch {
      return null;
    }
  }

  public async setSelectedModelId(modelId: string | null): Promise<void> {
    try {
      if (modelId) {
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODEL_ID, modelId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_MODEL_ID);
      }
    } catch (e) {
      console.error('Failed setting selected model ID:', e);
    }
  }

  public async getUserPreference(): Promise<RecommendationPreference> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCE);
      if (val === 'accuracy' || val === 'speed' || val === 'lowest-memory' || val === 'overall') {
        return val;
      }
      return 'overall';
    } catch {
      return 'overall';
    }
  }

  public async setUserPreference(pref: RecommendationPreference): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCE, pref);
    } catch (e) {
      console.error('Failed setting user preference:', e);
    }
  }

  public async getBenchmarkResults(): Promise<BenchmarkResult[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.BENCHMARK_RESULTS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  public async saveBenchmarkResult(result: BenchmarkResult): Promise<void> {
    try {
      const results = await this.getBenchmarkResults();
      // Prepend recent benchmark
      const updated = [result, ...results].slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.BENCHMARK_RESULTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed saving benchmark result:', e);
    }
  }

  public async clearBenchmarkResults(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.BENCHMARK_RESULTS);
    } catch (e) {
      console.error('Failed clearing benchmarks:', e);
    }
  }

  public async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  public async saveChatMessage(message: ChatMessage): Promise<void> {
    try {
      const history = await this.getChatHistory();
      const updated = [...history, message].slice(-100);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed saving chat message:', e);
    }
  }

  public async clearChatHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
    } catch (e) {
      console.error('Failed clearing chat:', e);
    }
  }

  public async getDarkMode(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
      return val === 'true';
    } catch {
      return false;
    }
  }

  public async setDarkMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Failed setting dark mode:', e);
    }
  }
}

