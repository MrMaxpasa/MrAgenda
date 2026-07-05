// Hoja de creación de hábito: nombre, icono y días activos.

import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import type { DiasHabito } from './rachas';

const ICONOS = ['💧', '📖', '🧘', '😴', '🏃', '🥗', '🪥', '✍️'];
// orden visual lunes→domingo; valores en días JS
const DIAS_UI: { etiqueta: string; dia: number }[] = [
  { etiqueta: 'L', dia: 1 },
  { etiqueta: 'M', dia: 2 },
  { etiqueta: 'X', dia: 3 },
  { etiqueta: 'J', dia: 4 },
  { etiqueta: 'V', dia: 5 },
  { etiqueta: 'S', dia: 6 },
  { etiqueta: 'D', dia: 0 },
];

interface Props {
  visible: boolean;
  onGuardar: (datos: { titulo: string; icono: string; dias: DiasHabito }) => void;
  onCerrar: () => void;
}

export function HojaHabito({ visible, onGuardar, onCerrar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const [titulo, setTitulo] = useState('');
  const [icono, setIcono] = useState(ICONOS[0]!);
  const [diasElegidos, setDiasElegidos] = useState<number[]>([]);

  const limpiarYCerrar = () => {
    setTitulo('');
    setIcono(ICONOS[0]!);
    setDiasElegidos([]);
    onCerrar();
  };

  const alternarDia = (dia: number) => {
    setDiasElegidos((actual) =>
      actual.includes(dia) ? actual.filter((d) => d !== dia) : [...actual, dia],
    );
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    onGuardar({
      titulo: titulo.trim(),
      icono,
      dias: diasElegidos.length === 0 ? 'diario' : diasElegidos,
    });
    limpiarYCerrar();
  };

  return (
    <HojaInferior visible={visible} onCerrar={limpiarYCerrar}>
      <Text style={estilos.etiqueta}>Nuevo hábito</Text>

          <TextInput
            style={estilos.campo}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="p. ej. «Beber agua»"
            placeholderTextColor={paleta.muted}
            autoFocus
            accessibilityLabel="Nombre del hábito"
          />

          <View style={estilos.filaIconos}>
            {ICONOS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setIcono(emoji)}
                accessibilityRole="button"
                accessibilityLabel={`Icono ${emoji}`}
                style={[estilos.icono, icono === emoji && estilos.iconoActivo]}
              >
                <Text style={estilos.iconoTexto}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={estilos.pista}>
            ¿Qué días? Sin marcar ninguno, cuenta todos los días.
          </Text>
          <View style={estilos.filaDias}>
            {DIAS_UI.map(({ etiqueta, dia }) => (
              <Pressable
                key={dia}
                onPress={() => alternarDia(dia)}
                accessibilityRole="button"
                accessibilityState={{ selected: diasElegidos.includes(dia) }}
                style={[estilos.dia, diasElegidos.includes(dia) && estilos.diaActivo]}
              >
                <Text
                  style={[
                    estilos.diaTexto,
                    diasElegidos.includes(dia) && estilos.diaTextoActivo,
                  ]}
                >
                  {etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>

      <Pressable
        onPress={guardar}
        accessibilityRole="button"
        disabled={!titulo.trim()}
        style={[estilos.guardar, !titulo.trim() && estilos.guardarInactivo]}
      >
        <Text style={estilos.guardarTexto}>Crear hábito</Text>
      </Pressable>
    </HojaInferior>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  etiqueta: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  campo: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: paleta.line,
    borderRadius: radios.campo,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
  filaIconos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radios.campo,
    borderWidth: 1,
    borderColor: paleta.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    borderColor: paleta.deporte,
    backgroundColor: paleta.deporteSuave,
  },
  iconoTexto: {
    fontSize: 20,
  },
  pista: {
    marginTop: 16,
    fontSize: 12.5,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
  filaDias: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dia: {
    flex: 1,
    minHeight: 44,
    borderRadius: radios.campo,
    borderWidth: 1,
    borderColor: paleta.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaActivo: {
    backgroundColor: paleta.ink,
    borderColor: paleta.ink,
  },
  diaTexto: {
    fontSize: 13,
    fontFamily: fuente.uiMedia,
    color: paleta.muted,
  },
  diaTextoActivo: {
    color: paleta.sobreInk,
  },
  guardar: {
    marginTop: 18,
    borderRadius: radios.campo,
    backgroundColor: paleta.ink,
    paddingVertical: 13,
    alignItems: 'center',
  },
  guardarInactivo: {
    opacity: 0.4,
  },
  guardarTexto: {
    color: paleta.sobreInk,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
});
