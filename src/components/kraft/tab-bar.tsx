import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type, useScheme, Schemes } from '@/theme';

export const TAB_LABELS: Record<string, string> = {
  index: 'NOTES',
  search: 'FIND',
  trash: 'TRASH',
};

export const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'book-open',
  search: 'search',
  trash: 'trash-2',
};

/**
 * Custom tab bar. Replaces expo-router's NativeTabs, which renders the
 * platform bar and cannot carry a kraft ground, a bundled font or a brick
 * selected state.
 */
export function KraftTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const styles = useStyles();
  const colors = Schemes[scheme];

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + Layout.space.xs }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = TAB_LABELS[route.name] ?? route.name.toUpperCase();
        const iconName = TAB_ICONS[route.name] ?? 'file-text';
        const iconColor = focused ? colors.accent : colors.text.secondary;

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={styles.tab}
            onPress={() => {
              haptics.selection();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}>
            <Feather name={iconName} size={18} color={iconColor} style={styles.tabIcon} />
            <Text style={[Type.tabLabel, focused ? styles.focusedLabel : styles.unfocusedLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: c.surface.card,
    borderTopWidth: Layout.hairline,
    borderTopColor: c.border.hairline,
    paddingTop: Layout.space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { marginBottom: 1 },
  focusedLabel: { color: c.accent },
  unfocusedLabel: { color: c.text.secondary },
}));
