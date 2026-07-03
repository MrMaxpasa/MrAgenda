// Menú rápido de posponer (decisión de producto: sin picker de calendario
// en v1): esta tarde · mañana · pasado mañana · el próximo lunes.

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

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
  onElegir: (opcion: OpcionPosponer) => void;
  onCerrar: () => void;
}

export function MenuPosponer({ visible, titulo, onElegir, onCerrar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={estilos.overlay} onPress={onCerrar}>
        <Pressable style={estilos.hoja} onPress={(e) => e.stopPropagation()}>
          <Text style={estilos.encabezado}>¿Para cuándo lo dejamos?</Text>
          {titulo ? (
            <Text style={estilos.subtitulo} numberOfLines={1}>
              {titulo}
            </Text>
          ) : null}
          {OPCIONES.map((opcion) => (
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,36,48,.3)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: paleta.card,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
  },
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
