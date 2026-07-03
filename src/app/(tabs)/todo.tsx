import { StyleSheet, Text, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

export default function PantallaTodo() {
  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Todo</Text>
      </View>
      <EstadoVacio mensaje="Aquí vivirán tus notas, listas y todo lo que guardes. Empieza con el botón +." />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  eyebrow: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
});
