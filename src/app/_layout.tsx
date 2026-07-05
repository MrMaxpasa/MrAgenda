import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/toast';
import { migrarBaseDeDatos, NOMBRE_BD } from '@/db/database';
import { HojaCaptura } from '@/features/captura/hoja-captura';
import { Notificador } from '@/features/items/notificador';
import { Bienvenida } from '@/features/retencion/hoja-bienvenida';
import { mapaFuentes } from '@/theme/fonts';
import { cargarPreferenciaTema, useEsOscuro, usePaleta } from '@/theme/use-tema';

SplashScreen.preventAutoHideAsync();

/** Vive dentro del SQLiteProvider: tema persistido + navegación tematizada. */
function AppTematizada() {
  const db = useSQLiteContext();
  const paleta = usePaleta();
  const esOscuro = useEsOscuro();

  useEffect(() => {
    cargarPreferenciaTema(db).catch(() => undefined);
  }, [db]);

  return (
    <>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: paleta.paper },
        }}
      />
      <HojaCaptura />
      <Toast />
      <Notificador />
      <Bienvenida />
    </>
  );
}

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
        <AppTematizada />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
