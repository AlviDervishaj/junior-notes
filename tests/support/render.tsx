import { render as rntlRender } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

/**
 * Fixed device metrics so inset-dependent padding is deterministic in tests.
 * Roughly an iPhone 14: 47pt status bar, 34pt home indicator.
 */
export const TEST_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={TEST_METRICS}>{children}</SafeAreaProvider>;
}

/**
 * Renders with the providers the app supplies at runtime. Components calling
 * useSafeAreaInsets throw without a SafeAreaProvider ancestor, so screens and
 * chrome components must be rendered through this rather than RNTL's render.
 */
export function render(ui: ReactElement) {
  return rntlRender(ui, { wrapper: Providers });
}
