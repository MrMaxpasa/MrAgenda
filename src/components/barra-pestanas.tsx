// Barra inferior personalizada según referencia/hoy-mockup.html:
// Hoy y Todo a la izquierda, FAB «+» de tinta en el centro, Tú y Ajustes
// a la derecha, sobre un degradado a transparente.
// El FAB es placeholder en Fase 0: rota al pulsar; la hoja de captura llega en Fase 1.

import { LinearGradient } from 'expo-linear-gradient';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

const ICONOS: Record<string, string> = {
  hoy: '☀️',
  todo: '🗂️',
  tu: '📈',
  ajustes: '⚙️',
};

// expo-router no exporta BottomTabBarProps: se deriva de la prop pública `tabBar`.
type PropsBarraPestanas = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function BarraPestanas({ state, descriptors, navigation }: PropsBarraPestanas) {
  const insets = useSafeAreaInsets();

  const destino = (nombre: string) => {
    const index = state.routes.findIndex((ruta) => ruta.name === nombre);
    const ruta = state.routes[index];
    if (!ruta) return null;
    const opciones = descriptors[ruta.key]?.options;
    const etiqueta = opciones?.title ?? ruta.name;
    const activo = state.index === index;

    const alPulsar = () => {
      const evento = navigation.emit({
        type: 'tabPress',
        target: ruta.key,
        canPreventDefault: true,
      });
      if (!activo && !evento.defaultPrevented) {
        navigation.navigate(ruta.name);
      }
    };

    return (
      <Pressable
        key={ruta.key}
        onPress={alPulsar}
        style={estilos.destino}
        accessibilityRole="tab"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={etiqueta}
      >
        <Text style={estilos.icono}>{ICONOS[ruta.name] ?? '•'}</Text>
        <Text style={[estilos.etiqueta, activo && estilos.etiquetaActiva]}>{etiqueta}</Text>
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={['rgba(251,252,253,0)', paleta.paper]}
      locations={[0, 0.4]}
      style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, 20) }]}
    >
      <View style={estilos.grupo}>
        {destino('hoy')}
        {destino('todo')}
      </View>
      <Fab />
      <View style={estilos.grupo}>
        {destino('tu')}
        {destino('ajustes')}
      </View>
    </LinearGradient>
  );
}

function Fab() {
  const reducirMovimiento = useReducedMotion();
  const presion = useSharedValue(0);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - presion.value * 0.1 },
      { rotate: `${presion.value * 90}deg` },
    ],
  }));

  const animarA = (valor: number) => {
    presion.value = reducirMovimiento ? valor : withTiming(valor, { duration: 150 });
  };

  return (
    <Pressable
      onPressIn={() => animarA(1)}
      onPressOut={() => animarA(0)}
      accessibilityRole="button"
      accessibilityLabel="Añadir"
      accessibilityHint="Abre la captura rápida"
    >
      <Animated.View style={[estilos.fab, estiloAnimado]}>
        <Text style={estilos.fabTexto}>+</Text>
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  barra: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  grupo: {
    flexDirection: 'row',
    gap: 26,
  },
  destino: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  icono: {
    fontSize: 19,
    marginBottom: 2,
  },
  etiqueta: {
    fontSize: tipografia.nav,
    fontFamily: fuente.uiMedia,
    color: paleta.muted,
  },
  etiquetaActiva: {
    color: paleta.ink,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: paleta.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: paleta.ink,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  fabTexto: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontFamily: fuente.uiRegular,
  },
});
