// Imported from per-weight subpaths, not the package roots. The root indexes
// re-export every variant, and Metro then bundles all 22 .ttf files (~1MB)
// instead of the four faces this app actually uses.
import { CourierPrime_400Regular } from '@expo-google-fonts/courier-prime/400Regular';
import { CourierPrime_700Bold } from '@expo-google-fonts/courier-prime/700Bold';
import { Jost_400Regular } from '@expo-google-fonts/jost/400Regular';
import { Jost_500Medium } from '@expo-google-fonts/jost/500Medium';
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
