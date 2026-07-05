// Toast superior como el del mockup: píldora de tinta que baja desde arriba
// y desaparece sola.

import { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { fuente } from '@/theme/fonts';
import { type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface EstadoToast {
  mensaje: string | null;
  mostrar: (mensaje: string) => void;
  ocultar: () => void;
}

export const useTiendaToast = create<EstadoToast>((set) => ({
  mensaje: null,
  mostrar: (mensaje) => set({ mensaje }),
  ocultar: () => set({ mensaje: null }),
}));

const DURACION_MS = 2200;

export function Toast() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const insets = useSafeAreaInsets();
  const mensaje = useTiendaToast((estado) => estado.mensaje);
  const ocultar = useTiendaToast((estado) => estado.ocultar);
  const reducirMovimiento = useReducedMotion();

  const progreso = useSharedValue(0);

  useEffect(() => {
    if (!mensaje) return;
    progreso.value = reducirMovimiento ? 1 : withTiming(1, { duration: 300 });
    const temporizador = setTimeout(() => {
      progreso.value = reducirMovimiento ? 0 : withTiming(0, { duration: 250 });
      setTimeout(ocultar, 260);
    }, DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [mensaje, ocultar, progreso, reducirMovimiento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ translateY: (progreso.value - 1) * 70 }],
  }));

  if (!mensaje) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[estilos.toast, { top: insets.top + 12 }, estiloAnimado]}
    >
      <Text style={estilos.texto}>{mensaje}</Text>
    </Animated.View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: paleta.ink,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
    zIndex: 10,
    elevation: 10,
  },
  texto: {
    color: paleta.sobreInk,
    fontSize: 13.5,
    fontFamily: fuente.uiRegular,
  },
});
