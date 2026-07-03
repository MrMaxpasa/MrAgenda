// Contenedor base de cada pestaña: fondo paper, safe area y padding del mockup.

import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '@/theme/tokens';

export function Pantalla({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 26 }]}>{children}</View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: paleta.paper,
    paddingHorizontal: 20,
    paddingBottom: 110, // hueco para la barra inferior flotante
  },
});
