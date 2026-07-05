// Tarjeta de briefing del mockup: fondo oscuro degradado, tag, texto con
// destacados en ámbar suave y chip de acción con borde translúcido.
// Solo se muestra en la página de hoy.

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fuente } from '@/theme/fonts';
import { radios } from '@/theme/tokens';

import { useBriefing } from './use-briefing';

interface Props {
  hoyISO: string;
}

export function TarjetaBriefing({ hoyISO }: Props) {
  const briefing = useBriefing(hoyISO);
  if (!briefing) return null;

  return (
    <LinearGradient
      colors={['#1E2A38', '#27384A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={estilos.tarjeta}
    >
      <Text style={estilos.tag}>Tu briefing</Text>
      <Text style={estilos.texto}>
        {briefing.segmentos.map((segmento, i) => (
          <Text key={i} style={segmento.destacado ? estilos.destacado : undefined}>
            {segmento.texto}
          </Text>
        ))}
      </Text>
      {briefing.sugerencia && (
        <Pressable
          onPress={briefing.usarSugerencia}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.chip, pressed && estilos.chipPulsado]}
        >
          <Text style={estilos.chipTexto}>{briefing.sugerencia.etiqueta}</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    marginTop: 16,
    marginHorizontal: 2,
    borderRadius: radios.tarjeta,
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 14,
  },
  tag: {
    fontSize: 11,
    fontFamily: fuente.uiMedia,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: '#9FB4C9',
  },
  texto: {
    marginTop: 7,
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: fuente.uiLigera,
    color: '#EDF2F7',
  },
  destacado: {
    color: '#FFD98E',
    fontFamily: fuente.uiRegular,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 11,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.16)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipPulsado: {
    backgroundColor: 'rgba(255,255,255,.22)',
  },
  chipTexto: {
    fontSize: 13,
    fontFamily: fuente.uiRegular,
    color: '#EDF2F7',
  },
});
