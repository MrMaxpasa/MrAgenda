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
import { CapaEditor } from '@/features/items/capa-editor';
import { Notificador } from '@/features/items/notificador';
import { Onboarding } from '@/features/onboarding/onboarding';
import { cargarPerfil, useTiendaPerfil } from '@/features/onboarding/tienda-perfil';
import { Bienvenida } from '@/features/retencion/hoja-bienvenida';
import { mapaFuentes } from '@/theme/fonts';
import { cargarPreferenciaTema, useEsOscuro, usePaleta } from '@/theme/use-tema';

SplashScreen.preventAutoHideAsync();

/** Vive dentro del SQLiteProvider: tema persistido + navegación tematizada. */
function AppTematizada() {
  const db = useSQLiteContext();
  const paleta = usePaleta();
  const esOscuro = useEsOscuro();
  const cargado = useTiendaPerfil((estado) => estado.cargado);
  const onboardingHecho = useTiendaPerfil((estado) => estado.onboardingHecho);

  useEffect(() => {
    cargarPreferenciaTema(db).catch(() => undefined);
    cargarPerfil(db).catch(() => undefined);
  }, [db]);

  // esperar a saber si toca onboarding evita un parpadeo de Hoy
  if (!cargado) return null;

  return (
    <>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      {onboardingHecho ? (
        <>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: paleta.paper },
            }}
          />
          <HojaCaptura />
          <CapaEditor />
          <Toast />
          <Notificador />
          <Bienvenida />
        </>
      ) : (
        <Onboarding />
      )}
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
