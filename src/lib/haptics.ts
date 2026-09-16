import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Tactile iOS haptics wrapper.
 * Provides safe, no-op execution on unsupported environments/platforms
 * and semantic triggers tailored to the tactile Kraft stationery aesthetic.
 */
export const haptics = {
  /** Subtle click for list selection, chip toggle, tab switch */
  selection: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.selectionAsync();
      }
    } catch {
      // safe fallback in tests / unsupported platforms
    }
  },

  /** Soft impact for standard interactions (card press, small buttons) */
  light: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // safe fallback
    }
  },

  /** Medium impact for state changes (pin/unpin, opening split dialog) */
  medium: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // safe fallback
    }
  },

  /** Heavy impact for destructive action prompts */
  heavy: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch {
      // safe fallback
    }
  },

  /** Success notification (note saved stamp, note split created, note deleted) */
  success: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // safe fallback
    }
  },

  /** Warning notification (confirm discard / confirm delete) */
  warning: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      // safe fallback
    }
  },

  /** Error notification (save failure) */
  error: async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // safe fallback
    }
  },
};
