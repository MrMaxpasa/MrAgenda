// Hoja de captura rápida (docs/02 §1): un solo campo, interpretación en
// vivo con chips editables, y guardar en un toque. Regla de los 3 segundos.

import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { crear } from '@/db/repositorios/items';
import { anadirElemento, asegurarLista } from '@/db/repositorios/listas';
import type { NivelAviso } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { asegurarPermisos } from '@/lib/notificaciones';
import { descripcionRecurrencia } from '@/lib/recurrencia';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { formatearCantidad } from './parser/cantidades';
import { interpretar, type TipoCaptura } from './parser';
import { useTiendaCaptura } from './tienda';

const CICLO_TIPOS: TipoCaptura[] = ['evento', 'tarea', 'nota', 'entreno'];
const ETIQUETA_TIPO: Record<TipoCaptura, string> = {
  evento: 'Evento',
  tarea: 'Tarea',
  nota: 'Nota',
  entreno: 'Deporte',
  referencia: 'Referencia',
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
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

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
  const [sinCantidad, setSinCantidad] = useState(false);
  const [sinLista, setSinLista] = useState(false);
  const [nivelAviso, setNivelAviso] = useState<NivelAviso>(1);
  const [offsetAviso, setOffsetAviso] = useState(0);

  const cambiarTexto = (nuevo: string) => {
    setTexto(nuevo);
    setTipoManual(null);
    setSinFecha(false);
    setSinHora(false);
    setSinRecurrencia(false);
    setSinCantidad(false);
    setSinLista(false);
    setNivelAviso(1);
    setOffsetAviso(0);
  };

  const interpretacion = useMemo(
    () => (texto.trim().length >= 3 ? interpretar(texto, new Date()) : null),
    [texto],
  );

  const cantidad = sinCantidad ? null : (interpretacion?.cantidad ?? null);
  const lista = sinLista ? null : (interpretacion?.lista ?? null);
  const personas = interpretacion?.personas ?? [];
  // «añade pan a la compra»: la lista manda sobre el tipo y el título
  const tipo = lista ? 'lista' : (tipoManual ?? interpretacion?.tipo ?? 'nota');
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

    if (lista) {
      // elemento de lista viva: contenedora + enlace (Fase 5)
      const contenedora = await asegurarLista(db, lista.lista);
      await anadirElemento(db, contenedora.id, lista.elemento);
      refrescarHoy();
      cerrarYLimpiar();
      mostrarToast(`Añadido a ${contenedora.titulo} ✓`);
      return;
    }

    const titulo = interpretacion?.titulo || texto.trim();
    const cuerpo = cantidad !== null ? `Gasto: ${formatearCantidad(cantidad)}` : null;

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
      cuerpo,
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
    // solo se llega aquí sin lista activa: tipo es un TipoCaptura
    const actual = tipo as TipoCaptura;
    const siguiente = CICLO_TIPOS[(CICLO_TIPOS.indexOf(actual) + 1) % CICLO_TIPOS.length]!;
    setTipoManual(siguiente);
  };

  return (
    <HojaInferior visible={abierta} onCerrar={cerrarYLimpiar}>
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
                  {lista ? (
                    <Pressable
                      onPress={() => setSinLista(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`Elemento de la lista ${lista.lista}, tocar para quitar`}
                      style={estilos.chipTipo}
                    >
                      <Text style={estilos.chipTipoTexto}>🛒 {lista.lista} ×</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={cicloTipo}
                      accessibilityRole="button"
                      accessibilityLabel={`Tipo ${ETIQUETA_TIPO[tipo as TipoCaptura]}, tocar para cambiar`}
                      style={estilos.chipTipo}
                    >
                      <Text style={estilos.chipTipoTexto}>{ETIQUETA_TIPO[tipo as TipoCaptura]} ↺</Text>
                    </Pressable>
                  )}
                  {personas.length > 0 && (
                    <View style={estilos.chip}>
                      <Text style={estilos.chipTexto}>👤 {personas.join(' y ')}</Text>
                    </View>
                  )}
                  {cantidad !== null && (
                    <Pressable
                      onPress={() => setSinCantidad(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar la cantidad"
                      style={estilos.chip}
                    >
                      <Text style={estilos.chipTexto}>💶 {formatearCantidad(cantidad)} ×</Text>
                    </Pressable>
                  )}
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
  panel: {
    marginTop: 12,
    backgroundColor: paleta.panelSuave,
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
    minHeight: 34,
    justifyContent: 'center',
  },
  chipTipoTexto: {
    color: paleta.sobreInk,
    fontSize: 12,
    fontFamily: fuente.uiMedia,
  },
  chip: {
    backgroundColor: paleta.chipSuave,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    minHeight: 34,
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
    color: paleta.sobreInk,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
});
