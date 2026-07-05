// Tarjeta de ítem de la cronología — réplica del mockup: hora en el color
// del tipo, título, meta (con «↻ cada martes · 5 de 8» en ámbar si es una
// serie) y círculo de check. Deslizar a la izquierda revela «Posponer».

import { useEffect, useMemo } from 'react';
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

import type { TipoItem } from '@/db/tipos';
import type { Instancia } from '@/features/items/instancias';
import { descripcionRecurrencia } from '@/lib/recurrencia';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

export function colorPorTipo(tipo: TipoItem, paleta: Colores): string {
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
  instancia: Instancia;
  onPressCheck?: () => void;
  onPosponer?: () => void;
  onArchivar?: () => void;
  onPressCuerpo?: () => void; // p. ej. abrir la sesión de un entreno
}

export function ItemCard({ instancia, onPressCheck, onPosponer, onArchivar, onPressCuerpo }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const { item, hecha, progreso } = instancia;
  const color = colorPorTipo(item.tipo, paleta);
  const hora =
    !item.todo_el_dia && item.fecha_inicio && item.fecha_inicio.length > 10
      ? item.fecha_inicio.slice(11, 16)
      : '—';

  let metaRecurrencia: string | null = null;
  if (item.rrule) {
    const descripcion = descripcionRecurrencia(item.rrule, item.rrule_fin, {
      conFin: !progreso,
    });
    metaRecurrencia = progreso
      ? `↻ ${descripcion} · ${progreso.n} de ${progreso.total}`
      : `↻ ${descripcion}`;
  }

  const reducirMovimiento = useReducedMotion();
  const escala = useSharedValue(1);
  const estiloCheck = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  useEffect(() => {
    if (hecha && !reducirMovimiento) {
      escala.value = withSequence(
        withTiming(1.25, { duration: 120 }),
        withTiming(1, { duration: 120 }),
      );
    }
  }, [hecha, reducirMovimiento, escala]);

  const acciones = (_progreso: unknown, _arrastre: unknown, metodos: SwipeableMethods) => (
    <View style={estilos.acciones}>
      {onArchivar && (
        <Pressable
          onPress={() => {
            metodos.close();
            onArchivar();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Archivar ${item.titulo}`}
          style={estilos.accionArchivar}
        >
          <Text style={estilos.accionTexto}>Archivar</Text>
        </Pressable>
      )}
      {onPosponer && (
        <Pressable
          onPress={() => {
            metodos.close();
            onPosponer();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Posponer ${item.titulo}`}
          style={estilos.accionPosponer}
        >
          <Text style={estilos.accionTexto}>Posponer</Text>
        </Pressable>
      )}
    </View>
  );

  const tarjeta = (
    <Pressable
      onPress={onPressCuerpo}
      disabled={!onPressCuerpo}
      accessibilityRole={onPressCuerpo ? 'button' : undefined}
      style={[estilos.tarjeta, hecha && estilos.tarjetaHecha]}
    >
      <Text style={[estilos.hora, { color: hecha ? paleta.done : color }]}>{hora}</Text>
      <View style={estilos.cuerpo}>
        <Text style={[estilos.titulo, hecha && estilos.tituloHecho]} numberOfLines={2}>
          {item.titulo}
        </Text>
        <Text style={estilos.meta} numberOfLines={1}>
          {item.cuerpo ?? ETIQUETAS[item.tipo]}
          {instancia.ultimaMarca ? ` · última vez: ${instancia.ultimaMarca}` : ''}
          {metaRecurrencia ? <Text style={estilos.metaRecurrente}> · {metaRecurrencia}</Text> : null}
        </Text>
      </View>
      <Pressable
        onPress={onPressCheck}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hecha }}
        accessibilityLabel={`Completar ${item.titulo}`}
      >
        <Animated.View style={[estilos.check, hecha && estilos.checkHecho, estiloCheck]}>
          {hecha ? <Text style={estilos.checkMarca}>✓</Text> : null}
        </Animated.View>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={estilos.item}>
      <View style={[estilos.punto, { borderColor: hecha ? paleta.done : color }]} />
      {(onPosponer || onArchivar) && !hecha ? (
        <ReanimatedSwipeable
          renderRightActions={acciones}
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

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
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
  metaRecurrente: {
    color: paleta.ambar,
    fontFamily: fuente.uiMedia,
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
    color: paleta.sobreInk,
    fontSize: 14,
    lineHeight: 16,
  },
  acciones: {
    flexDirection: 'row',
  },
  accionPosponer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: paleta.ambar,
    borderRadius: radios.tarjeta,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  accionArchivar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: paleta.done,
    borderRadius: radios.tarjeta,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  accionTexto: {
    color: paleta.sobreInk,
    fontSize: 13,
    fontFamily: fuente.uiMedia,
  },
});
