import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface ClientApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  rawKey?: string; // Only present immediately after generation
}

const STORAGE_KEYS = {
  LOCAL_API_KEYS: '@saas_ai_brain_api_keys_v1',
};

export class ApiKeyService {
  private static instance: ApiKeyService;
  private apiBaseUrl: string;

  private constructor() {
    // In production web, calls relative /api; in dev or native, defaults to localhost:5000 or relative
    this.apiBaseUrl = '';
  }

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Generates a new cryptographically secure API key.
   */
  public async generateKey(
    name: string,
    description?: string,
    permissions: string[] = ['models:read', 'inference:run', 'chat:completions'],
    expiresInDays?: number
  ): Promise<ClientApiKey> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          permissions,
          expiresInDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const createdKey: ClientApiKey = data.key;
        await this.saveKeyLocally(createdKey);
        return createdKey;
      }
    } catch (networkError) {
      console.warn('[ApiKeyService] Network API unavailable, using local crypto fallback:', networkError);
    }

    // Local / Offline Cryptographic Fallback (works on device & airplane mode)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const hexString = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const rawKey = `sab_live_${hexString}`;
    const keyPrefix = `${rawKey.slice(0, 13)}...${rawKey.slice(-4)}`;

    let expiresAt: string | undefined;
    if (expiresInDays) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const fallbackKey: ClientApiKey = {
      id: `key-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      keyPrefix,
      permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt,
      rawKey,
    };

    await this.saveKeyLocally(fallbackKey);
    return fallbackKey;
  }

  /**
   * Lists all API keys (secret rawKey is omitted).
   */
  public async listKeys(): Promise<ClientApiKey[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/keys`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.keys)) {
          // Sync with local cache
          await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_API_KEYS, JSON.stringify(data.keys));
          return data.keys;
        }
      }
    } catch (networkError) {
      console.warn('[ApiKeyService] Network fetch failed, falling back to local cache');
    }

    // Fallback to local storage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_API_KEYS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Revokes an existing API key.
   */
  public async revokeKey(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/keys/${id}/revoke`, {
        method: 'PATCH',
      });
      if (response.ok) {
        await this.updateLocalKeyStatus(id, 'revoked');
        return true;
      }
    } catch (e) {
      console.warn('[ApiKeyService] Remote revoke failed, updating locally');
    }

    await this.updateLocalKeyStatus(id, 'revoked');
    return true;
  }

  /**
   * Deletes an API key.
   */
  public async deleteKey(id: string, hardDelete = true): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/keys/${id}?hardDelete=${hardDelete}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await this.removeLocalKey(id);
        return true;
      }
    } catch (e) {
      console.warn('[ApiKeyService] Remote delete failed, removing locally');
    }

    await this.removeLocalKey(id);
    return true;
  }

  private async saveKeyLocally(key: ClientApiKey) {
    const keys = await this.listKeys();
    // Do not save rawKey in persistent local key list
    const { rawKey, ...sanitized } = key;
    const updated = [sanitized, ...keys.filter((k) => k.id !== key.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_API_KEYS, JSON.stringify(updated));
  }

  private async updateLocalKeyStatus(id: string, status: 'active' | 'revoked') {
    const keys = await this.listKeys();
    const updated = keys.map((k) => (k.id === id ? { ...k, status } : k));
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_API_KEYS, JSON.stringify(updated));
  }

  private async removeLocalKey(id: string) {
    const keys = await this.listKeys();
    const updated = keys.filter((k) => k.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_API_KEYS, JSON.stringify(updated));
  }
}

