import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/toast';
import { migrarBaseDeDatos, NOMBRE_BD } from '@/db/database';
import { HojaCaptura } from '@/features/captura/hoja-captura';
import { mapaFuentes } from '@/theme/fonts';
import { paleta } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts(mapaFuentes);

  useEffect(() => {
    if (fuentesListas || errorFuentes) {
      SplashScreen.hideAsync();
    }
  }, [fuentesListas, errorFuentes]);

  if (!fuentesListas && !errorFuentes) {
    return null; // splash visible hasta que las fuentes estén listas
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={NOMBRE_BD} onInit={migrarBaseDeDatos}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: paleta.paper },
          }}
        />
        <HojaCaptura />
        <Toast />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
