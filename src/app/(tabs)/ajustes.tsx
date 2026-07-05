import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/pantalla';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import {
  fijarPreferenciaTema,
  usePaleta,
  useTiendaTema,
  type PreferenciaTema,
} from '@/theme/use-tema';

const TEMAS: { clave: PreferenciaTema; etiqueta: string; descripcion: string }[] = [
  { clave: 'auto', etiqueta: 'Automático', descripcion: 'Sigue el tema del móvil' },
  { clave: 'claro', etiqueta: 'Claro', descripcion: 'Siempre claro' },
  { clave: 'oscuro', etiqueta: 'Oscuro', descripcion: 'Siempre oscuro' },
];

export default function PantallaAjustes() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);
  const db = useSQLiteContext();
  const preferencia = useTiendaTema((estado) => estado.preferencia);

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Ajustes</Text>
      </View>

      <Text style={estilos.tituloSeccion}>Tema</Text>
      <View style={estilos.lista}>
        {TEMAS.map(({ clave, etiqueta, descripcion }) => (
          <Pressable
            key={clave}
            onPress={() => fijarPreferenciaTema(db, clave)}
            accessibilityRole="radio"
            accessibilityState={{ selected: preferencia === clave }}
            style={({ pressed }) => [estilos.fila, pressed && estilos.filaPulsada]}
          >
            <View style={estilos.textos}>
              <Text style={estilos.etiqueta}>{etiqueta}</Text>
              <Text style={estilos.descripcion}>{descripcion}</Text>
            </View>
            <View style={[estilos.radio, preferencia === clave && estilos.radioActivo]}>
              {preferencia === clave && <View style={estilos.radioPunto} />}
            </View>
          </Pressable>
        ))}
      </View>
    </Pantalla>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
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
    tituloSeccion: {
      marginTop: 14,
      marginBottom: 8,
      paddingHorizontal: 2,
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    lista: {
      backgroundColor: paleta.card,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      paddingHorizontal: 15,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: paleta.line,
    },
    filaPulsada: {
      backgroundColor: paleta.fog,
    },
    textos: {
      flex: 1,
    },
    etiqueta: {
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    descripcion: {
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      marginTop: 1,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: paleta.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActivo: {
      borderColor: paleta.deporte,
    },
    radioPunto: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: paleta.deporte,
    },
  });
