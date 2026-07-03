// Hoja de captura rápida (docs/02 §1): un solo campo, interpretación en
// vivo con chips editables, y guardar en un toque. Regla de los 3 segundos.

import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTiendaToast } from '@/components/toast';
import { crear } from '@/db/repositorios/items';
import type { NivelAviso } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { asegurarPermisos } from '@/lib/notificaciones';
import { descripcionRecurrencia } from '@/lib/recurrencia';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

import { interpretar, type TipoCaptura } from './parser';
import { useTiendaCaptura } from './tienda';

const CICLO_TIPOS: TipoCaptura[] = ['evento', 'tarea', 'nota', 'entreno'];
const ETIQUETA_TIPO: Record<TipoCaptura, string> = {
  evento: 'Evento',
  tarea: 'Tarea',
  nota: 'Nota',
  entreno: 'Deporte',
};

const ETIQUETA_AVISO: Record<NivelAviso, string> = {
  0: '🔕 Silencioso',
  1: '🔔 Aviso',
  2: '⏰ Alarma',
};
const CICLO_OFFSET = [0, 15, 30, 60];

function etiquetaFecha(fecha: string, fragmento: string | null): string {
  if (fragmento) return fragmento;
  const hoy = new Date();
  if (fecha === aFechaISO(hoy)) return 'hoy';
  if (fecha === aFechaISO(sumarDias(hoy, 1))) return 'mañana';
  return fecha;
}

export function HojaCaptura() {
  const db = useSQLiteContext();
  const abierta = useTiendaCaptura((estado) => estado.abierta);
  const cerrar = useTiendaCaptura((estado) => estado.cerrar);
  const refrescarHoy = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const [texto, setTexto] = useState('');
  const [tipoManual, setTipoManual] = useState<TipoCaptura | null>(null);
  const [sinFecha, setSinFecha] = useState(false);
  const [sinHora, setSinHora] = useState(false);
  const [sinRecurrencia, setSinRecurrencia] = useState(false);
  const [nivelAviso, setNivelAviso] = useState<NivelAviso>(1);
  const [offsetAviso, setOffsetAviso] = useState(0);

  const cambiarTexto = (nuevo: string) => {
    setTexto(nuevo);
    setTipoManual(null);
    setSinFecha(false);
    setSinHora(false);
    setSinRecurrencia(false);
    setNivelAviso(1);
    setOffsetAviso(0);
  };

  const interpretacion = useMemo(
    () => (texto.trim().length >= 3 ? interpretar(texto, new Date()) : null),
    [texto],
  );

  const tipo = tipoManual ?? interpretacion?.tipo ?? 'nota';
  const fecha = sinFecha ? null : (interpretacion?.fecha ?? null);
  const hora = sinHora ? null : (interpretacion?.hora ?? null);
  const recurrencia = sinRecurrencia ? null : (interpretacion?.recurrencia ?? null);
  const fragmentoFecha =
    interpretacion?.fragmentos.find((f) => f.campo === 'fecha')?.texto ?? null;

  const cerrarYLimpiar = () => {
    cerrar();
    cambiarTexto('');
  };

  const guardar = async () => {
    if (!texto.trim()) return;
    const titulo = interpretacion?.titulo || texto.trim();

    let fecha_inicio: string | null = null;
    let todo_el_dia = false;
    if (fecha && hora) {
      fecha_inicio = `${fecha}T${String(hora.hora).padStart(2, '0')}:${String(
        hora.minuto,
      ).padStart(2, '0')}`;
    } else if (fecha) {
      fecha_inicio = fecha;
      todo_el_dia = true;
    }

    await crear(db, {
      tipo,
      titulo,
      fecha_inicio,
      todo_el_dia,
      rrule: recurrencia?.rrule ?? null,
      rrule_fin: recurrencia?.fin ?? null,
      nivel_aviso: hora ? nivelAviso : 1,
      aviso_offset_min: hora && nivelAviso >= 1 ? offsetAviso : null,
    });
    if (hora && nivelAviso >= 1) {
      // pedirlos justo cuando el usuario guarda algo con hora: con contexto
      asegurarPermisos();
    }
    refrescarHoy();
    cerrarYLimpiar();
    mostrarToast('Guardado en tu agenda ✓');
  };

  const cicloTipo = () => {
    const siguiente = CICLO_TIPOS[(CICLO_TIPOS.indexOf(tipo) + 1) % CICLO_TIPOS.length]!;
    setTipoManual(siguiente);
  };

  return (
    <Modal visible={abierta} transparent animationType="slide" onRequestClose={cerrarYLimpiar}>
      <Pressable style={estilos.overlay} onPress={cerrarYLimpiar}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.contenedorTeclado}
          pointerEvents="box-none"
        >
          <Pressable style={estilos.hoja} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.asa} />
            <Text style={estilos.etiqueta}>Captura rápida · escribe como hablas</Text>
            <TextInput
              style={estilos.campo}
              value={texto}
              onChangeText={cambiarTexto}
              placeholder="p. ej. «pádel cada jueves 19h con Marc»"
              placeholderTextColor={paleta.muted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={guardar}
              accessibilityLabel="Captura rápida"
            />

            {interpretacion && (
              <View style={estilos.panel}>
                <View style={estilos.filaChips}>
                  <Text style={estilos.panelTexto}>Lo guardo como</Text>
                  <Pressable
                    onPress={cicloTipo}
                    accessibilityRole="button"
                    accessibilityLabel={`Tipo ${ETIQUETA_TIPO[tipo]}, tocar para cambiar`}
                    style={estilos.chipTipo}
                  >
                    <Text style={estilos.chipTipoTexto}>{ETIQUETA_TIPO[tipo]} ↺</Text>
                  </Pressable>
                  {fecha && (
                    <Pressable
                      onPress={() => setSinFecha(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar la fecha"
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>
                        📅 {etiquetaFecha(fecha, fragmentoFecha)} ×
                      </Text>
                    </Pressable>
                  )}
                  {hora && (
                    <Pressable
                      onPress={() => setSinHora(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar la hora"
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>
                        🕐 {String(hora.hora).padStart(2, '0')}:
                        {String(hora.minuto).padStart(2, '0')} ×
                      </Text>
                    </Pressable>
                  )}
                  {recurrencia && (
                    <Pressable
                      onPress={() => setSinRecurrencia(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar la repetición"
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>
                        ↻ {descripcionRecurrencia(recurrencia.rrule, recurrencia.fin)} ×
                      </Text>
                    </Pressable>
                  )}
                  {hora && (
                    <Pressable
                      onPress={() => setNivelAviso(((nivelAviso + 1) % 3) as NivelAviso)}
                      accessibilityRole="button"
                      accessibilityLabel={`Nivel de aviso: ${ETIQUETA_AVISO[nivelAviso]}, tocar para cambiar`}
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>{ETIQUETA_AVISO[nivelAviso]} ↺</Text>
                    </Pressable>
                  )}
                  {hora && nivelAviso >= 1 && (
                    <Pressable
                      onPress={() =>
                        setOffsetAviso(
                          CICLO_OFFSET[(CICLO_OFFSET.indexOf(offsetAviso) + 1) % CICLO_OFFSET.length]!,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Aviso previo, tocar para cambiar"
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>
                        {offsetAviso === 0 ? 'al momento' : `${offsetAviso} min antes`} ↺
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Text style={estilos.pista}>
                  Toca «Guardar» y aparecerá en tu día — sin formularios.
                </Text>
              </View>
            )}

            <Pressable
              onPress={guardar}
              accessibilityRole="button"
              disabled={!texto.trim()}
              style={[estilos.guardar, !texto.trim() && estilos.guardarInactivo]}
            >
              <Text style={estilos.guardarTexto}>Guardar</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  contenedorTeclado: {
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: paleta.card,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  asa: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: paleta.line,
    alignSelf: 'center',
    marginBottom: 14,
  },
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
  panel: {
    marginTop: 12,
    backgroundColor: '#F2F6FA',
    borderRadius: radios.campo,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  filaChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  panelTexto: {
    fontSize: 13.5,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
  chipTipo: {
    backgroundColor: paleta.ink,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    minHeight: 26,
    justifyContent: 'center',
  },
  chipTipoTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fuente.uiMedia,
  },
  chip: {
    backgroundColor: '#E7EEF7',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    minHeight: 26,
    justifyContent: 'center',
  },
  chipTexto: {
    color: paleta.evento,
    fontSize: 12,
    fontFamily: fuente.uiMedia,
  },
  pista: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
  guardar: {
    marginTop: 14,
    borderRadius: radios.campo,
    backgroundColor: paleta.ink,
    paddingVertical: 13,
    alignItems: 'center',
  },
  guardarInactivo: {
    opacity: 0.4,
  },
  guardarTexto: {
    color: '#FFFFFF',
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
});
