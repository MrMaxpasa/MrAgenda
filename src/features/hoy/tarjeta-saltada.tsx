// Tarjeta suave para la instancia saltada de ayer. Tono sin culpa:
// orienta (qué pasó y qué hacer), nunca regaña.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import type { Instancia } from '@/features/items/instancias';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  instancia: Instancia;
  onMoverAHoy: () => void;
  onDejarPasar: () => void;
}

export function TarjetaSaltada({ instancia, onMoverAHoy, onDejarPasar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.texto}>
        Ayer se te pasó «{instancia.item.titulo}» — no pasa nada. ¿La movemos a hoy?
      </Text>
      <View style={estilos.acciones}>
        <Pressable onPress={onMoverAHoy} accessibilityRole="button" style={estilos.botonPrimario}>
          <Text style={estilos.botonPrimarioTexto}>Mover a hoy</Text>
        </Pressable>
        <Pressable onPress={onDejarPasar} accessibilityRole="button" style={estilos.botonSuave}>
          <Text style={estilos.botonSuaveTexto}>Dejar pasar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  tarjeta: {
    marginTop: 16,
    marginHorizontal: 2,
    backgroundColor: paleta.fog,
    borderRadius: radios.tarjeta,
    padding: 14,
  },
  texto: {
    fontSize: 13.5,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
    lineHeight: 19,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  botonPrimario: {
    backgroundColor: paleta.ink,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    minHeight: 32,
    justifyContent: 'center',
  },
  botonPrimarioTexto: {
    color: paleta.sobreInk,
    fontSize: tipografia.nav + 1,
    fontFamily: fuente.uiMedia,
  },
  botonSuave: {
    minHeight: 32,
    justifyContent: 'center',
  },
  botonSuaveTexto: {
    color: paleta.muted,
    fontSize: tipografia.nav + 1,
    fontFamily: fuente.uiMedia,
  },
});
