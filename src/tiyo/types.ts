export type TiyoAction =
  | 'greet'
  | 'smile'
  | 'wave'
  | 'thumbs_up'
  | 'goodbye'
  | 'idle';

export type TiyoEmotion =
  | 'happy'
  | 'neutral'
  | 'curious'
  | 'sad'
  | 'excited';

export interface TiyoResponse {
  response: string;
  action: TiyoAction;
  emotion: TiyoEmotion;
  rawText?: string;
}

export type TiyoModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error';

export interface TiyoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: TiyoAction;
  emotion?: TiyoEmotion;
}

export interface ITiyoBrain {
  getStatus(): TiyoModelStatus;
  getStatusMessage(): string;
  getDownloadProgress(): number;
  downloadModel(onProgress?: (progress: number, downloaded: number, total: number) => void): Promise<void>;
  loadModel(): Promise<void>;
  generateReply(
    userPrompt: string,
    conversationHistory?: TiyoMessage[],
    onToken?: (token: string) => void
  ): Promise<TiyoResponse>;
}
