// Tarjeta de ítem de la cronología — réplica del mockup: hora en el color
// del tipo, título, meta y círculo de check. Deslizar hacia la izquierda
// revela «Posponer»; el check anima con escala (respetando reduced motion).

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Item, TipoItem } from '@/db/tipos';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

export function colorPorTipo(tipo: TipoItem): string {
  switch (tipo) {
    case 'evento':
      return paleta.evento;
    case 'entreno':
    case 'habito':
      return paleta.deporte;
    case 'tarea':
      return paleta.ambar;
    default:
      return paleta.nota;
  }
}

const ETIQUETAS: Record<TipoItem, string> = {
  evento: 'Evento',
  tarea: 'Tarea',
  nota: 'Nota',
  habito: 'Hábito',
  entreno: 'Entreno',
  lista: 'Lista',
  referencia: 'Referencia',
};

interface Props {
  item: Item;
  onPressCheck?: () => void;
  onPosponer?: () => void;
}

export function ItemCard({ item, onPressCheck, onPosponer }: Props) {
  const hecho = item.estado === 'hecho';
  const color = colorPorTipo(item.tipo);
  const hora =
    !item.todo_el_dia && item.fecha_inicio && item.fecha_inicio.length > 10
      ? item.fecha_inicio.slice(11, 16)
      : '—';

  const reducirMovimiento = useReducedMotion();
  const escala = useSharedValue(1);
  const estiloCheck = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  useEffect(() => {
    if (hecho && !reducirMovimiento) {
      escala.value = withSequence(
        withTiming(1.25, { duration: 120 }),
        withTiming(1, { duration: 120 }),
      );
    }
  }, [hecho, reducirMovimiento, escala]);

  const accionPosponer = (_progreso: unknown, _arrastre: unknown, metodos: SwipeableMethods) => (
    <Pressable
      onPress={() => {
        metodos.close();
        onPosponer?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Posponer ${item.titulo}`}
      style={estilos.accionPosponer}
    >
      <Text style={estilos.accionPosponerTexto}>Posponer</Text>
    </Pressable>
  );

  const tarjeta = (
    <View style={[estilos.tarjeta, hecho && estilos.tarjetaHecha]}>
      <Text style={[estilos.hora, { color: hecho ? paleta.done : color }]}>{hora}</Text>
      <View style={estilos.cuerpo}>
        <Text style={[estilos.titulo, hecho && estilos.tituloHecho]} numberOfLines={2}>
          {item.titulo}
        </Text>
        <Text style={estilos.meta} numberOfLines={1}>
          {item.cuerpo ?? ETIQUETAS[item.tipo]}
        </Text>
      </View>
      <Pressable
        onPress={onPressCheck}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hecho }}
        accessibilityLabel={`Completar ${item.titulo}`}
      >
        <Animated.View style={[estilos.check, hecho && estilos.checkHecho, estiloCheck]}>
          {hecho ? <Text style={estilos.checkMarca}>✓</Text> : null}
        </Animated.View>
      </Pressable>
    </View>
  );

  return (
    <View style={estilos.item}>
      <View style={[estilos.punto, { borderColor: hecho ? paleta.done : color }]} />
      {onPosponer && !hecho ? (
        <ReanimatedSwipeable
          renderRightActions={accionPosponer}
          rightThreshold={32}
          friction={2}
          overshootRight={false}
        >
          {tarjeta}
        </ReanimatedSwipeable>
      ) : (
        tarjeta
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  item: {
    position: 'relative',
    marginBottom: 10,
  },
  punto: {
    position: 'absolute',
    left: -22,
    top: 17,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    backgroundColor: paleta.paper,
    zIndex: 1,
  },
  tarjeta: {
    backgroundColor: paleta.card,
    borderWidth: 1,
    borderColor: paleta.line,
    borderRadius: radios.tarjeta,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tarjetaHecha: {
    opacity: 0.7,
  },
  hora: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiSemi,
    minWidth: 44,
  },
  cuerpo: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
    color: paleta.ink,
    lineHeight: 20,
  },
  tituloHecho: {
    color: paleta.done,
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    marginTop: 2,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: paleta.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkHecho: {
    backgroundColor: paleta.deporte,
    borderColor: paleta.deporte,
  },
  checkMarca: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
  },
  accionPosponer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: paleta.ambar,
    borderRadius: radios.tarjeta,
    paddingHorizontal: 18,
    marginLeft: 8,
  },
  accionPosponerTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fuente.uiMedia,
  },
});
