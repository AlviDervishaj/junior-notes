// SDK 57 note: `Tabs` lives at expo-router/js-tabs, not the expo-router root.
// The root only ships NativeTabs (expo-router/unstable-native-tabs), which
// renders the platform bar and cannot be styled to this design.
import { Tabs } from 'expo-router/js-tabs';

import { KraftTabBar } from '@/components/kraft/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <KraftTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="trash" />
    </Tabs>
  );
}
