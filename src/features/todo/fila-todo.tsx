// Fila compacta de la pestaña Todo: punto de color por tipo, título, meta
// y check opcional. Más ligera que ItemCard (aquí no hay cronología).

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorPorTipo } from '@/components/item-card';
import type { Item } from '@/db/tipos';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

interface Props {
  item: Item;
  meta?: string;
  hecha?: boolean;
  onPress?: () => void;
  onToggle?: () => void;
}

export function FilaTodo({ item, meta, hecha = item.estado === 'hecho', onPress, onToggle }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [estilos.fila, pressed && onPress ? estilos.pulsada : null]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[estilos.punto, { backgroundColor: colorPorTipo(item.tipo) }]} />
      <View style={estilos.cuerpo}>
        <Text style={[estilos.titulo, hecha && estilos.tituloHecho]} numberOfLines={1}>
          {item.titulo}
        </Text>
        {meta ? (
          <Text style={estilos.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onToggle && (
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hecha }}
          accessibilityLabel={`Completar ${item.titulo}`}
          style={[estilos.check, hecha && estilos.checkHecho]}
        >
          {hecha ? <Text style={estilos.checkMarca}>✓</Text> : null}
        </Pressable>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: paleta.line,
  },
  pulsada: {
    backgroundColor: paleta.fog,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cuerpo: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
  tituloHecho: {
    color: paleta.done,
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    marginTop: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 12,
    lineHeight: 14,
  },
});
