import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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

  // Tied to fonts only, deliberately. SQLiteProvider renders null until the
  // database is open, so hiding the splash from inside onInit would leave it
  // up forever if opening ever hung.
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  const onInit = useCallback(async (db: SqlDb) => {
    await migrate(db);
    await purgeOldDeleted(db, Date.now());
  }, []);

  // SQLiteProvider's default error handler rethrows during render, which
  // crashes the tree instead of showing this screen. onError is the documented
  // way to intercept it.
  const onError = useCallback((error: Error) => {
    setDbError(error);
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
    // The paper ground sits behind the provider so the brief moment before the
    // database opens reads as blank paper rather than a white flash.
    <View style={styles.ground}>
      <StatusBar style="light" />
      {/* `key` remounts the provider so a retry re-runs onInit. */}
      <SQLiteProvider key={attempt} databaseName="notes.db" onInit={onInit} onError={onError}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.surface.page },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="note/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SQLiteProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { flex: 1, backgroundColor: Colors.surface.page },
});
