// Estado vacío = invitación a actuar (docs/03-diseno.md).

import { StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import { fuente } from '@/theme/fonts';
import { tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  mensaje: string;
}

export function EstadoVacio({ mensaje }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.texto}>{mensaje}</Text>
    </View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  texto: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
