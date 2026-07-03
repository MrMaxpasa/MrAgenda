import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { migrarBaseDeDatos, NOMBRE_BD } from '@/db/database';
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
    <SQLiteProvider databaseName={NOMBRE_BD} onInit={migrarBaseDeDatos}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: paleta.paper },
        }}
      />
    </SQLiteProvider>
  );
}
