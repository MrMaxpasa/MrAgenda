import { Tabs } from 'expo-router';

import { BarraPestanas } from '@/components/barra-pestanas';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BarraPestanas {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="hoy" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="todo" options={{ title: 'Todo' }} />
      <Tabs.Screen name="tu" options={{ title: 'Tú' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
