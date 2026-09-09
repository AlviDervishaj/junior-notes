import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

import { ErrorScreen } from '@/components/kraft/error-screen';
import { migrate } from '@/db/migrations';
import { purgeOldDeleted } from '@/db/notes';
import type { SqlDb } from '@/db/types';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { Colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready: fontsReady } = useAppFonts();
  const [dbError, setDbError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onInit = useCallback(async (db: SqlDb) => {
    try {
      await migrate(db);
      await purgeOldDeleted(db, Date.now());
      setDbError(null);
    } catch (error) {
      setDbError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  if (!fontsReady) return null;

  if (dbError) {
    return (
      <ErrorScreen
        title="Could not open your notebook"
        detail={dbError.message}
        onRetry={() => {
          setDbError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  return (
    // `key` remounts the provider so a retry re-runs onInit.
    <SQLiteProvider key={attempt} databaseName="notes.db" onInit={onInit}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.surface.page },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SQLiteProvider>
  );
}
