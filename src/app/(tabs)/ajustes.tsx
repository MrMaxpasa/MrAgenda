import { StyleSheet, Text, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

export default function PantallaAjustes() {
  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Ajustes</Text>
      </View>
      <EstadoVacio mensaje="Pronto podrás poner tu nombre y ajustar tus avisos aquí." />
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
