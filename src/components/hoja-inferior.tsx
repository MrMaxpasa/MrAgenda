// Hoja inferior común del proyecto: Modal + overlay + asa + elevación con
// el teclado. En Android los Modal viven en su propia ventana nativa donde
// adjustResize NO aplica (y KeyboardAvoidingView sin behavior no hace
// nada), así que la elevación se hace a mano escuchando los eventos del
// teclado y animando el padding — mismo comportamiento en todas las hojas.

import { useEffect, type PropsWithChildren } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type KeyboardEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { paleta, radios } from '@/theme/tokens';

function useAlturaTeclado() {
  const altura = useSharedValue(0);
  const reducirMovimiento = useReducedMotion();

  useEffect(() => {
    // iOS avisa antes de animar (Will*); Android solo después (Did*)
    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoOcultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const alMostrar = (e: KeyboardEvent) => {
      const destino = e.endCoordinates.height;
      altura.value = reducirMovimiento
        ? destino
        : withTiming(destino, { duration: e.duration || 200 });
    };
    const alOcultar = (e: KeyboardEvent) => {
      altura.value = reducirMovimiento ? 0 : withTiming(0, { duration: e?.duration || 200 });
    };

    const s1 = Keyboard.addListener(eventoMostrar, alMostrar);
    const s2 = Keyboard.addListener(eventoOcultar, alOcultar);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [altura, reducirMovimiento]);

  return altura;
}

interface Props extends PropsWithChildren {
  visible: boolean;
  onCerrar: () => void;
  animacion?: 'slide' | 'fade';
}

export function HojaInferior({ visible, onCerrar, animacion = 'slide', children }: Props) {
  const alturaTeclado = useAlturaTeclado();
  const { height: altoVentana } = useWindowDimensions();

  const estiloElevacion = useAnimatedStyle(() => ({
    paddingBottom: alturaTeclado.value,
    // con teclado abierto la hoja no debe salirse por arriba
    maxHeight: altoVentana - 24,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animacion}
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <Pressable style={estilos.overlay} onPress={onCerrar} accessibilityLabel="Cerrar">
        <Animated.View style={estiloElevacion} pointerEvents="box-none">
          <Pressable style={estilos.hoja} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.asa} />
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,36,48,.3)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: paleta.card,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  asa: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: paleta.line,
    alignSelf: 'center',
    marginBottom: 14,
  },
});
