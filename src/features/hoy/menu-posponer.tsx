// Menú rápido de posponer (decisión de producto: sin picker de calendario
// en v1): esta tarde · mañana · pasado mañana · el próximo lunes.

import { Pressable, StyleSheet, Text } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

export type OpcionPosponer = 'tarde' | 'manana' | 'pasado' | 'lunes';

const OPCIONES: { clave: OpcionPosponer; etiqueta: string }[] = [
  { clave: 'tarde', etiqueta: 'Esta tarde · 17:00' },
  { clave: 'manana', etiqueta: 'Mañana' },
  { clave: 'pasado', etiqueta: 'Pasado mañana' },
  { clave: 'lunes', etiqueta: 'El próximo lunes' },
];

interface Props {
  visible: boolean;
  titulo: string | null;
  sinTarde?: boolean; // en series recurrentes no se ofrece «esta tarde»
  onElegir: (opcion: OpcionPosponer) => void;
  onCerrar: () => void;
}

export function MenuPosponer({ visible, titulo, sinTarde = false, onElegir, onCerrar }: Props) {
  const opciones = sinTarde ? OPCIONES.filter((o) => o.clave !== 'tarde') : OPCIONES;
  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} animacion="fade">
      <Text style={estilos.encabezado}>¿Para cuándo lo dejamos?</Text>
      {titulo ? (
        <Text style={estilos.subtitulo} numberOfLines={1}>
          {titulo}
        </Text>
      ) : null}
      {opciones.map((opcion) => (
        <Pressable
          key={opcion.clave}
          onPress={() => onElegir(opcion.clave)}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPulsada]}
        >
          <Text style={estilos.opcionTexto}>{opcion.etiqueta}</Text>
        </Pressable>
      ))}
      <Pressable onPress={onCerrar} accessibilityRole="button" style={estilos.cancelar}>
        <Text style={estilos.cancelarTexto}>Déjalo donde estaba</Text>
      </Pressable>
    </HojaInferior>
  );
}

export type AlcancePosponer = 'una' | 'todas';

interface PropsAlcance {
  visible: boolean;
  titulo: string | null;
  onElegir: (alcance: AlcancePosponer) => void;
  onCerrar: () => void;
}

/** Paso previo al posponer una serie: ¿solo esta instancia o todas las futuras? */
export function MenuAlcance({ visible, titulo, onElegir, onCerrar }: PropsAlcance) {
  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} animacion="fade">
      <Text style={estilos.encabezado}>Se repite · ¿qué movemos?</Text>
      {titulo ? (
        <Text style={estilos.subtitulo} numberOfLines={1}>
          {titulo}
        </Text>
      ) : null}
      <Pressable
        onPress={() => onElegir('una')}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPulsada]}
      >
        <Text style={estilos.opcionTexto}>Solo esta vez</Text>
      </Pressable>
      <Pressable
        onPress={() => onElegir('todas')}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPulsada]}
      >
        <Text style={estilos.opcionTexto}>Todas las futuras</Text>
      </Pressable>
      <Pressable onPress={onCerrar} accessibilityRole="button" style={estilos.cancelar}>
        <Text style={estilos.cancelarTexto}>Déjalo como está</Text>
      </Pressable>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  subtitulo: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
    color: paleta.ink,
    marginTop: 6,
    marginBottom: 4,
  },
  opcion: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: paleta.line,
  },
  opcionPulsada: {
    backgroundColor: paleta.fog,
  },
  opcionTexto: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
  cancelar: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  cancelarTexto: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
});
