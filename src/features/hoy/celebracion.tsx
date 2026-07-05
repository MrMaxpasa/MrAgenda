// Micro-celebración al completar el día (docs/02 §2): discreta, una sola
// vez al día, con háptica de éxito. Sin confeti permanente (docs/03).

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { guardarAjuste, obtenerAjuste } from '@/db/repositorios/ajustes';
import { fuente } from '@/theme/fonts';
import { radios, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  fecha: string;
  pendientes: number;
  totalDelDia: number;
}

export function Celebracion({ fecha, pendientes, totalDelDia }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const reducirMovimiento = useReducedMotion();
  const [mostrar, setMostrar] = useState(false);
  const progreso = useSharedValue(0);

  useEffect(() => {
    if (pendientes !== 0 || totalDelDia === 0) return;
    let vivo = true;
    const clave = `celebrado:${fecha}`;
    obtenerAjuste(db, clave)
      .then(async (ya) => {
        if (!vivo || ya) return;
        await guardarAjuste(db, clave, '1');
        setMostrar(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        progreso.value = reducirMovimiento
          ? withSequence(withTiming(1, { duration: 0 }), withDelay(2200, withTiming(0, { duration: 0 })))
          : withSequence(
              withTiming(1, { duration: 350 }),
              withDelay(1800, withTiming(0, { duration: 400 })),
            );
        setTimeout(() => setMostrar(false), 2700);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [db, fecha, pendientes, totalDelDia, progreso, reducirMovimiento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ scale: 0.9 + progreso.value * 0.1 }],
  }));

  if (!mostrar) return null;

  return (
    <Animated.View pointerEvents="none" style={[estilos.tarjeta, estiloAnimado]}>
      <Text style={estilos.emoji}>🎉</Text>
      <Text style={estilos.texto}>Día completado</Text>
      <Text style={estilos.subtexto}>Todo lo de hoy, hecho. Disfruta el resto.</Text>
    </Animated.View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  tarjeta: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: paleta.ink,
    borderRadius: radios.tarjeta,
    paddingVertical: 20,
    paddingHorizontal: 26,
    alignItems: 'center',
    zIndex: 20,
    elevation: 12,
  },
  emoji: {
    fontSize: 30,
  },
  texto: {
    marginTop: 6,
    fontSize: 17,
    fontFamily: fuente.uiSemi,
    color: paleta.sobreInk,
  },
  subtexto: {
    marginTop: 2,
    fontSize: 12.5,
    fontFamily: fuente.uiRegular,
    color: paleta.sobreInk,
    opacity: 0.75,
  },
});
