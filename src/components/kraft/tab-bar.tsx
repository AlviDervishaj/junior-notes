import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Layout, Type } from '@/theme';

export const TAB_LABELS: Record<string, string> = {
  index: 'NOTES',
  search: 'FIND',
};

/**
 * Custom tab bar. Replaces expo-router's NativeTabs, which renders the
 * platform bar and cannot carry a kraft ground, a bundled font or a brick
 * selected state.
 */
export function KraftTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + Layout.space.sm }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = TAB_LABELS[route.name] ?? route.name.toUpperCase();

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}>
            <Text
              style={[Type.tabLabel, { color: focused ? Colors.accent : Colors.text.secondary }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.card,
    borderTopWidth: Layout.hairline,
    borderTopColor: Colors.border.hairline,
    paddingTop: Layout.space.md,
  },
  tab: { flex: 1, alignItems: 'center' },
});
