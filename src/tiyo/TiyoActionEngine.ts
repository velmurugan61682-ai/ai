import { TiyoAction, TiyoEmotion } from './types';
import { validateAction, validateEmotion } from './actionValidator';

export type TiyoState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'gesture';

export type StateChangeListener = (
  state: TiyoState,
  action: TiyoAction,
  emotion: TiyoEmotion
) => void;

export interface ActionEngineConfig {
  gestureDurationMs?: number;
}

export class TiyoActionEngine {
  private currentState: TiyoState = 'idle';
  private currentAction: TiyoAction = 'idle';
  private currentEmotion: TiyoEmotion = 'neutral';
  private gestureTimer: any = null;
  private listeners: Set<StateChangeListener> = new Set();
  private gestureDurationMs: number = 2500;

  constructor(config?: ActionEngineConfig) {
    if (config?.gestureDurationMs !== undefined) {
      this.gestureDurationMs = config.gestureDurationMs;
    }
  }

  public getState(): TiyoState {
    return this.currentState;
  }

  public getAction(): TiyoAction {
    return this.currentAction;
  }

  public getEmotion(): TiyoEmotion {
    return this.currentEmotion;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    listener(this.currentState, this.currentAction, this.currentEmotion);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState, this.currentAction, this.currentEmotion);
      } catch (err) {
        console.warn('[TiyoActionEngine] Listener error:', err);
      }
    }
  }

  private clearGestureTimer(): void {
    if (this.gestureTimer) {
      clearTimeout(this.gestureTimer);
      this.gestureTimer = null;
    }
  }

  /**
   * Transition to listening state (App driven when mic starts)
   */
  public startListening(): void {
    this.clearGestureTimer();
    this.currentState = 'listening';
    this.currentAction = 'idle';
    this.currentEmotion = 'curious';
    this.notify();
  }

  /**
   * Transition to thinking state (App driven when model inference starts)
   */
  public startThinking(): void {
    this.clearGestureTimer();
    this.currentState = 'thinking';
    this.currentAction = 'idle';
    this.currentEmotion = 'curious';
    this.notify();
  }

  /**
   * Transition to speaking state (App driven when TTS begins)
   */
  public startSpeaking(rawEmotion?: string): void {
    this.clearGestureTimer();
    this.currentState = 'speaking';
    this.currentAction = 'idle';
    this.currentEmotion = validateEmotion(rawEmotion);
    this.notify();
  }

  /**
   * Transition to gesture after speaking ends.
   * If action is 'idle', returns immediately to idle state.
   * Otherwise schedules an auto-return timer to return to idle.
   */
  public playGesture(rawAction: string, rawEmotion?: string): void {
    this.clearGestureTimer();
    const action = validateAction(rawAction);
    const emotion = validateEmotion(rawEmotion);

    this.currentAction = action;
    this.currentEmotion = emotion;

    if (action === 'idle') {
      this.currentState = 'idle';
      this.notify();
      return;
    }

    this.currentState = 'gesture';
    this.notify();

    this.gestureTimer = setTimeout(() => {
      this.resetToIdle();
    }, this.gestureDurationMs);
  }

  /**
   * Resets state machine to idle on error, cancel, or gesture completion.
   */
  public resetToIdle(): void {
    this.clearGestureTimer();
    this.currentState = 'idle';
    this.currentAction = 'idle';
    this.currentEmotion = 'neutral';
    this.notify();
  }

  /**
   * Handles user cancellation or interrupt (e.g. tapping stop button).
   */
  public cancel(): void {
    this.resetToIdle();
  }

  /**
   * Handles error state transition.
   */
  public onError(): void {
    this.clearGestureTimer();
    this.currentState = 'idle';
    this.currentAction = 'idle';
    this.currentEmotion = 'sad';
    this.notify();

    // After brief moment of sadness, return to neutral idle
    this.gestureTimer = setTimeout(() => {
      this.resetToIdle();
    }, 2000);
  }
}

