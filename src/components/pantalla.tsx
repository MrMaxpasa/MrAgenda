// Contenedor base de cada pestaña: fondo paper, safe area y padding del mockup.

import { useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

export function Pantalla({ children }: PropsWithChildren) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 26 }]}>{children}</View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: paleta.paper,
    paddingHorizontal: 20,
    paddingBottom: 110, // hueco para la barra inferior flotante
  },
});
