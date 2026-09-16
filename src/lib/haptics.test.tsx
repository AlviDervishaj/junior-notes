import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { haptics } from './haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('haptics utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  test('triggers selectionAsync on selection()', async () => {
    await haptics.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  test('triggers impactAsync(Light) on light()', async () => {
    await haptics.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  test('triggers impactAsync(Medium) on medium()', async () => {
    await haptics.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  test('triggers impactAsync(Heavy) on heavy()', async () => {
    await haptics.heavy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  test('triggers notificationAsync(Success) on success()', async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  test('triggers notificationAsync(Warning) on warning()', async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  test('triggers notificationAsync(Error) on error()', async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  test('does not throw when an underlying expo-haptics call fails', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptics failed'));
    await expect(haptics.light()).resolves.toBeUndefined();
  });
});
