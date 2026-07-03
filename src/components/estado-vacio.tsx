// Estado vacío = invitación a actuar (docs/03-diseno.md).

import { StyleSheet, Text, View } from 'react-native';

import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

interface Props {
  mensaje: string;
}

export function EstadoVacio({ mensaje }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.texto}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
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
