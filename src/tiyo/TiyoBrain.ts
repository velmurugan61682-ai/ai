import { Platform } from 'react-native';
import { ITiyoBrain } from './types';
import { AndroidTiyoBrain } from './AndroidTiyoBrain';
import { WebTiyoBrain } from './WebTiyoBrain';

export function getTiyoBrain(): ITiyoBrain {
  if (Platform.OS === 'android') {
    return AndroidTiyoBrain.getInstance();
  }
  return WebTiyoBrain.getInstance();
}

export * from './types';
export * from './actionValidator';
export * from './tiyoPrompt';
