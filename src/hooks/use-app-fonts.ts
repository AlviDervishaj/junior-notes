import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';
import { Jost_400Regular, Jost_500Medium } from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';

/**
 * Loads the bundled faces. Resolves ready=true on success AND on failure:
 * degraded typography is acceptable, a stuck splash screen is not (spec §8).
 */
export function useAppFonts(): { ready: boolean; error: Error | null } {
  const [loaded, error] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return { ready: loaded || error !== null, error: error ?? null };
}
