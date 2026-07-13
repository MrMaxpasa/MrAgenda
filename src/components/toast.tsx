// Toast superior como el del mockup: píldora de tinta que baja desde arriba
// y desaparece sola.

import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

export interface AccionToast {
  etiqueta: string;
  onDeshacer: () => void;
}

interface EstadoToast {
  mensaje: string | null;
  accion: AccionToast | null;
  mostrar: (mensaje: string, accion?: AccionToast) => void;
  ocultar: () => void;
}

export const useTiendaToast = create<EstadoToast>((set) => ({
  mensaje: null,
  accion: null,
  mostrar: (mensaje, accion) => set({ mensaje, accion: accion ?? null }),
  ocultar: () => set({ mensaje: null, accion: null }),
}));

const DURACION_MS = 2200;
// con «Deshacer» el toast dura más para dar tiempo a tocarlo
const DURACION_ACCION_MS = 4200;

export function Toast() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const insets = useSafeAreaInsets();
  const mensaje = useTiendaToast((estado) => estado.mensaje);
  const accion = useTiendaToast((estado) => estado.accion);
  const ocultar = useTiendaToast((estado) => estado.ocultar);
  const reducirMovimiento = useReducedMotion();

  const progreso = useSharedValue(0);

  useEffect(() => {
    if (!mensaje) return;
    progreso.value = reducirMovimiento ? 1 : withTiming(1, { duration: 300 });
    const temporizador = setTimeout(
      () => {
        progreso.value = reducirMovimiento ? 0 : withTiming(0, { duration: 250 });
        setTimeout(ocultar, 260);
      },
      accion ? DURACION_ACCION_MS : DURACION_MS,
    );
    return () => clearTimeout(temporizador);
  }, [mensaje, accion, ocultar, progreso, reducirMovimiento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ translateY: (progreso.value - 1) * 70 }],
  }));

  if (!mensaje) return null;

  const deshacer = () => {
    accion?.onDeshacer();
    ocultar();
  };

  return (
    <Animated.View
      pointerEvents={accion ? 'box-none' : 'none'}
      style={[estilos.toast, { top: insets.top + 12 }, estiloAnimado]}
    >
      <View style={estilos.contenido}>
        <Text style={estilos.texto}>{mensaje}</Text>
        {accion && (
          <Pressable
            onPress={deshacer}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
            style={estilos.accion}
          >
            <Text style={estilos.accionTexto}>{accion.etiqueta}</Text>
          </Pressable>
        )}
      </View>
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
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  texto: {
    color: paleta.sobreInk,
    fontSize: 13.5,
    fontFamily: fuente.uiRegular,
  },
  accion: {
    minHeight: 28,
    justifyContent: 'center',
  },
  accionTexto: {
    color: paleta.ambar,
    fontSize: 13.5,
    fontFamily: fuente.uiSemi,
  },
});
