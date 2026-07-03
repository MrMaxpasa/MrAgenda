import { StyleSheet, Text, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { formatearFechaLarga, saludoSegunHora } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

export default function PantallaHoy() {
  const ahora = new Date();

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>{formatearFechaLarga(ahora)}</Text>
        <Text style={estilos.saludo}>{saludoSegunHora(ahora)}</Text>
      </View>
      <EstadoVacio mensaje="Toca + y escribe lo primero que tengas en la cabeza." />
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
  saludo: {
    fontSize: tipografia.saludo,
    fontFamily: fuente.displayItalica,
    color: paleta.ink,
    marginTop: 6,
    lineHeight: 36,
  },
});
