// Editor universal de un ítem con fecha (tarea/evento/entreno): título,
// fecha (chips rápidos + calendario para un día exacto), hora, repetición
// completa (crear/cambiar/quitar; cada N días/semanas/meses, días concretos
// del semanal y fin «durante N veces»), nivel de aviso y eliminar.
//
// En series recurrentes, editar fecha/hora/recurrencia reutiliza la semántica
// de `posponer`: título/aviso son de toda la serie; mover un día es «solo esta»
// (excepción) o «todas las futuras» (dividirSerie); cambiar la regla entera o
// quitarla divide la serie desde hoy y conserva el historial anterior.

import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { crearExcepcion } from '@/db/repositorios/excepciones';
import { actualizar, dividirSerie } from '@/db/repositorios/items';
import type { Item, NivelAviso, NuevoItem, TipoItem } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { MenuAlcance, type AlcancePosponer } from '@/features/hoy/menu-posponer';
import { camposDeFecha } from '@/features/items/campos-fecha';
import type { Instancia } from '@/features/items/instancias';
import { Calendario } from '@/features/tu/calendario';
import type { MapaDias } from '@/features/tu/use-dias-calendario';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import {
  conDiaDe,
  rruleDesdeSeleccion,
  seleccionDeRrule,
  type FrecuenciaSel,
  type SeleccionRecurrencia,
} from '@/lib/recurrencia';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

const ETIQUETA_AVISO: Record<NivelAviso, string> = {
  0: '🔕 Silencioso',
  1: '🔔 Aviso',
  2: '⏰ Alarma',
};

const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// tipos que pueden vivir en la cronología y convertirse entre sí
const TIPOS: { clave: TipoItem; etiqueta: string }[] = [
  { clave: 'evento', etiqueta: 'Evento' },
  { clave: 'tarea', etiqueta: 'Tarea' },
  { clave: 'nota', etiqueta: 'Nota' },
  { clave: 'entreno', etiqueta: 'Entreno' },
];

const FRECUENCIAS: { clave: FrecuenciaSel; etiqueta: string }[] = [
  { clave: 'ninguna', etiqueta: 'No se repite' },
  { clave: 'diaria', etiqueta: 'Cada día' },
  { clave: 'semanal', etiqueta: 'Cada semana' },
  { clave: 'mensual', etiqueta: 'Cada mes' },
];

// orden visual lunes→domingo; valores en días JS (0=domingo)
const DIAS_UI: { etiqueta: string; dia: number }[] = [
  { etiqueta: 'L', dia: 1 },
  { etiqueta: 'M', dia: 2 },
  { etiqueta: 'X', dia: 3 },
  { etiqueta: 'J', dia: 4 },
  { etiqueta: 'V', dia: 5 },
  { etiqueta: 'S', dia: 6 },
  { etiqueta: 'D', dia: 0 },
];

const unidadIntervalo = (f: FrecuenciaSel, n: number): string => {
  if (f === 'diaria') return n === 1 ? 'día' : 'días';
  if (f === 'semanal') return n === 1 ? 'semana' : 'semanas';
  return n === 1 ? 'mes' : 'meses';
};

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

const normSel = (s: SeleccionRecurrencia): string =>
  `${s.frecuencia}:${[...s.dias].sort((a, b) => a - b).join(',')}:${s.intervalo}:${s.cuenta ?? ''}`;

interface Props {
  item: Item;
  fechaOriginal: string; // instancia tocada
  onCerrar: () => void;
  onEliminar: () => void; // archiva + toast de deshacer (lo gobierna CapaEditor)
}

export function HojaEditar({ item, fechaOriginal, onCerrar, onEliminar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const esSerie = item.rrule !== null;
  const horaOriginal =
    item.fecha_inicio && item.fecha_inicio.length > 10 ? item.fecha_inicio.slice(11, 16) : '';

  const [titulo, setTitulo] = useState(item.titulo);
  const [tipo, setTipo] = useState<TipoItem>(item.tipo);
  const [cuerpo, setCuerpo] = useState(item.cuerpo ?? '');
  // en series, la «fecha» es la de la instancia tocada; en sueltos, su fecha_inicio
  const [fecha, setFecha] = useState<string | null>(
    esSerie ? fechaOriginal : (item.fecha_inicio?.slice(0, 10) ?? null),
  );
  const [hora, setHora] = useState(horaOriginal);
  const [nivelAviso, setNivelAviso] = useState<NivelAviso>(item.nivel_aviso);

  const seleccionOriginal = useMemo(() => seleccionDeRrule(item.rrule), [item.rrule]);
  const [seleccion, setSeleccion] = useState<SeleccionRecurrencia>(seleccionOriginal);
  const [recurrenciaTocada, setRecurrenciaTocada] = useState(false);

  const [preguntandoAlcance, setPreguntandoAlcance] = useState(false);

  // calendario para elegir un día exacto
  const [mostrandoCalendario, setMostrandoCalendario] = useState(false);
  const [anclaCal, setAnclaCal] = useState<Date>(() => new Date(`${fecha ?? aFechaISO(new Date())}T00:00`));
  const mapaVacio = useMemo<MapaDias>(() => new Map<string, Instancia[]>(), []);

  const hoy = aFechaISO(new Date());
  const manana = aFechaISO(sumarDias(new Date(), 1));
  const horaValida = hora === '' || RE_HORA.test(hora);

  const etiquetaFecha = (f: string): string =>
    f === hoy ? 'hoy' : f === manana ? 'mañana' : `${Number(f.slice(8))}/${Number(f.slice(5, 7))}`;

  const elegirFecha = (f: string | null) => {
    setFecha(f);
    if (f === null) setHora('');
    setMostrandoCalendario(false);
  };

  // REGLA DE PRODUCTO: una nota nunca lleva hora — algo que ocurre a una hora es
  // un evento o una tarea. El campo no se ofrece en notas, y pasar a Nota la limpia.
  const esNota = tipo === 'nota';
  const elegirTipo = (clave: TipoItem) => {
    setTipo(clave);
    if (clave === 'nota') setHora('');
  };

  const abrirCalendario = () => {
    setAnclaCal(new Date(`${fecha ?? hoy}T00:00`));
    setMostrandoCalendario((v) => !v);
  };

  // ── cambios de recurrencia (chips) ──
  const cambiarSeleccion = (cambio: Partial<SeleccionRecurrencia>) => {
    setRecurrenciaTocada(true);
    setSeleccion((prev) => ({ ...prev, ...cambio }));
  };

  const elegirFrecuencia = (clave: FrecuenciaSel) => {
    if (clave !== 'semanal') {
      cambiarSeleccion({ frecuencia: clave, dias: [] });
      return;
    }
    // al pasar a semanal sin días, marcar el día de la fecha base para verlo
    setRecurrenciaTocada(true);
    setSeleccion((prev) => ({
      ...prev,
      frecuencia: 'semanal',
      dias: prev.dias.length > 0 ? prev.dias : fecha ? [new Date(`${fecha}T00:00`).getDay()] : [],
    }));
  };

  const alternarDia = (dia: number) => {
    setRecurrenciaTocada(true);
    setSeleccion((prev) => ({
      ...prev,
      frecuencia: 'semanal',
      dias: prev.dias.includes(dia) ? prev.dias.filter((d) => d !== dia) : [...prev.dias, dia],
    }));
  };

  const ajustarIntervalo = (delta: number) =>
    cambiarSeleccion({ intervalo: clamp(seleccion.intervalo + delta, 1, 99) });

  const ajustarCuenta = (delta: number) =>
    cambiarSeleccion({ cuenta: clamp((seleccion.cuenta ?? 1) + delta, 1, 999) });

  const reglaCambiada = recurrenciaTocada && normSel(seleccion) !== normSel(seleccionOriginal);

  const finalizar = (mensaje: string) => {
    refrescar();
    onCerrar();
    mostrarToast(mensaje);
  };

  // atributos «globales» (valen para toda la serie o el ítem suelto): título,
  // tipo, cuerpo de nota y aviso. Se aplican antes de estructurar la recurrencia.
  const cambiosGlobales = (): Partial<NuevoItem> => {
    const cambios: Partial<NuevoItem> = {};
    if (titulo.trim() && titulo.trim() !== item.titulo) cambios.titulo = titulo.trim();
    if (tipo !== item.tipo) cambios.tipo = tipo;
    if (tipo === 'nota' && (cuerpo.trim() || null) !== (item.cuerpo ?? null)) {
      cambios.cuerpo = cuerpo.trim() || null;
    }
    if (hora !== '' && horaValida && nivelAviso !== item.nivel_aviso) cambios.nivel_aviso = nivelAviso;
    return cambios;
  };

  const aplicarGlobales = async () => {
    const cambios = cambiosGlobales();
    if (Object.keys(cambios).length > 0) await actualizar(db, item.id, cambios);
  };

  // ── guardar un ítem suelto (sin recurrencia original) ──
  const guardarSuelto = async () => {
    const cambios: Partial<NuevoItem> = { titulo: titulo.trim(), ...cambiosGlobales() };
    const horaValidada = hora && RE_HORA.test(hora) ? hora : null;
    const { fecha_inicio, todo_el_dia } = camposDeFecha(tipo, fecha, horaValidada);
    cambios.fecha_inicio = fecha_inicio;
    cambios.todo_el_dia = todo_el_dia;
    cambios.nivel_aviso = fecha_inicio && !todo_el_dia ? nivelAviso : item.nivel_aviso;

    if (recurrenciaTocada && fecha) {
      const rec = rruleDesdeSeleccion(seleccion, fecha);
      cambios.rrule = rec.rrule;
      cambios.rrule_fin = rec.fin;
    }
    await actualizar(db, item.id, cambios);
    finalizar('Cambios guardados ✓');
  };

  // ── serie: cambiar la regla o quitarla (siempre «desde hoy») ──
  const aplicarCambioRegla = async () => {
    await aplicarGlobales();
    if (seleccion.frecuencia === 'ninguna') {
      const nueva = await dividirSerie(db, item.id, hoy, {});
      if (nueva) await actualizar(db, nueva.id, { rrule: null, rrule_fin: null });
    } else {
      const rec = rruleDesdeSeleccion(seleccion, hoy);
      await dividirSerie(db, item.id, hoy, { rrule: rec.rrule!, rrule_fin: rec.fin });
    }
    finalizar('Repetición actualizada ✓');
  };

  // ── serie: cambiar (o quitar) la hora de todas las futuras, desde la instancia ──
  const aplicarHoraTodas = async () => {
    await aplicarGlobales();
    await dividirSerie(db, item.id, fechaOriginal, camposDeFecha(tipo, fechaOriginal, hora || null));
    finalizar(hora ? 'Hora actualizada ✓' : 'Cambios guardados ✓');
  };

  // ── serie: mover el día de la instancia (con alcance) ──
  const aplicarAlcance = async (alcance: AlcancePosponer) => {
    setPreguntandoAlcance(false);
    await aplicarGlobales();
    const destino = fecha!;
    if (alcance === 'una') {
      await crearExcepcion(db, item.id, fechaOriginal, 'mover', destino);
    } else {
      const sufijoHora = item.fecha_inicio && item.fecha_inicio.length > 10 ? item.fecha_inicio.slice(10) : '';
      const nueva = await dividirSerie(db, item.id, fechaOriginal, {
        fecha_inicio: `${destino}${sufijoHora}`,
      });
      if (nueva?.rrule) await actualizar(db, nueva.id, { rrule: conDiaDe(nueva.rrule, destino) });
    }
    finalizar('Cambios guardados ✓');
  };

  const guardar = async () => {
    if (!titulo.trim() || !horaValida) return;

    if (!esSerie) {
      await guardarSuelto();
      return;
    }
    // serie
    if (reglaCambiada) {
      await aplicarCambioRegla();
      return;
    }
    const horaCambiada = hora !== horaOriginal;
    const fechaCambiada = fecha !== fechaOriginal;
    if (horaCambiada) {
      await aplicarHoraTodas();
      return;
    }
    if (fechaCambiada) {
      setPreguntandoAlcance(true); // pregunta «solo esta / todas»
      return;
    }
    // solo título/aviso
    await aplicarGlobales();
    finalizar('Cambios guardados ✓');
  };

  const guardarInactivo = !titulo.trim() || !horaValida;
  // el semanal necesita al menos un día marcado
  const recurrenciaInvalida = seleccion.frecuencia === 'semanal' && seleccion.dias.length === 0;

  return (
    <>
      <HojaInferior visible={!preguntandoAlcance} onCerrar={onCerrar}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estilos.scroll}
        >
          <Text style={estilos.etiqueta}>Editar</Text>
          <TextInput
            style={estilos.campo}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título"
            placeholderTextColor={paleta.muted}
            accessibilityLabel="Título"
          />

          <Text style={estilos.subetiqueta}>¿Qué es?</Text>
          <View style={estilos.chips}>
            {TIPOS.map(({ clave, etiqueta }) => (
              <Pressable
                key={clave}
                onPress={() => elegirTipo(clave)}
                accessibilityRole="button"
                accessibilityState={{ selected: tipo === clave }}
                style={[estilos.chip, tipo === clave && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, tipo === clave && estilos.chipTextoActivo]}>
                  {etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>

          {tipo === 'nota' && (
            <>
              <Text style={estilos.subetiqueta}>Nota (opcional)</Text>
              <TextInput
                style={[estilos.campo, estilos.campoMultilinea]}
                value={cuerpo}
                onChangeText={setCuerpo}
                placeholder="Escribe aquí…"
                placeholderTextColor={paleta.muted}
                multiline
                accessibilityLabel="Contenido de la nota"
              />
            </>
          )}

          <Text style={estilos.subetiqueta}>{esSerie ? 'Este día' : 'Fecha'}</Text>
          <View style={estilos.chips}>
            {[
              { clave: hoy, texto: 'Hoy' },
              { clave: manana, texto: 'Mañana' },
            ].map(({ clave, texto }) => (
              <Pressable
                key={clave}
                onPress={() => elegirFecha(clave)}
                accessibilityRole="button"
                style={[estilos.chip, fecha === clave && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, fecha === clave && estilos.chipTextoActivo]}>
                  {texto}
                </Text>
              </Pressable>
            ))}
            {fecha && fecha !== hoy && fecha !== manana && (
              <View style={[estilos.chip, estilos.chipActivo]}>
                <Text style={[estilos.chipTexto, estilos.chipTextoActivo]}>{etiquetaFecha(fecha)}</Text>
              </View>
            )}
            <Pressable
              onPress={abrirCalendario}
              accessibilityRole="button"
              style={[estilos.chip, mostrandoCalendario && estilos.chipActivo]}
            >
              <Text style={[estilos.chipTexto, mostrandoCalendario && estilos.chipTextoActivo]}>
                📅 Otro día…
              </Text>
            </Pressable>
            {!esSerie && (
              <Pressable
                onPress={() => elegirFecha(null)}
                accessibilityRole="button"
                style={[estilos.chip, fecha === null && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, fecha === null && estilos.chipTextoActivo]}>
                  Sin fecha
                </Text>
              </Pressable>
            )}
          </View>

          {mostrandoCalendario && (
            <View style={estilos.calendario}>
              <Calendario
                granularidad="mes"
                ancla={anclaCal}
                diaSeleccionado={fecha ?? ''}
                hoyISO={hoy}
                mapa={mapaVacio}
                onNavegar={(delta) =>
                  setAnclaCal((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1))
                }
                onSeleccionar={elegirFecha}
              />
            </View>
          )}

          {fecha && !esNota && (
            <>
              <Text style={estilos.subetiqueta}>Hora (opcional)</Text>
              <TextInput
                style={[estilos.campo, !horaValida && estilos.campoError]}
                value={hora}
                onChangeText={setHora}
                placeholder="HH:MM"
                placeholderTextColor={paleta.muted}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Hora en formato HH:MM"
              />
              {!horaValida && (
                <Text style={estilos.error}>Usa el formato HH:MM (p. ej. 19:30).</Text>
              )}
            </>
          )}

          {esNota && (
            <Text style={estilos.pista}>
              Las notas no llevan hora. Si la necesitas, hazla Evento o Tarea.
            </Text>
          )}

          {fecha && (
            <>
              <Text style={estilos.subetiqueta}>Repetición</Text>
              <View style={estilos.chips}>
                {FRECUENCIAS.map(({ clave, etiqueta }) => (
                  <Pressable
                    key={clave}
                    onPress={() => elegirFrecuencia(clave)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccion.frecuencia === clave }}
                    style={[estilos.chip, seleccion.frecuencia === clave && estilos.chipActivo]}
                  >
                    <Text
                      style={[
                        estilos.chipTexto,
                        seleccion.frecuencia === clave && estilos.chipTextoActivo,
                      ]}
                    >
                      {etiqueta}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {seleccion.frecuencia === 'semanal' && (
                <View style={estilos.filaDias}>
                  {DIAS_UI.map(({ etiqueta, dia }) => (
                    <Pressable
                      key={dia}
                      onPress={() => alternarDia(dia)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: seleccion.dias.includes(dia) }}
                      style={[estilos.dia, seleccion.dias.includes(dia) && estilos.diaActivo]}
                    >
                      <Text
                        style={[
                          estilos.diaTexto,
                          seleccion.dias.includes(dia) && estilos.diaTextoActivo,
                        ]}
                      >
                        {etiqueta}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {seleccion.frecuencia !== 'ninguna' && (
                <>
                  <View style={estilos.filaControl}>
                    <Text style={estilos.controlEtiqueta}>Cada</Text>
                    <Stepper
                      valor={seleccion.intervalo}
                      sufijo={unidadIntervalo(seleccion.frecuencia, seleccion.intervalo)}
                      onCambiar={ajustarIntervalo}
                      estilos={estilos}
                    />
                  </View>

                  <View style={estilos.filaControl}>
                    <Text style={estilos.controlEtiqueta}>Termina</Text>
                    <View style={estilos.chips}>
                      <Pressable
                        onPress={() => cambiarSeleccion({ cuenta: null })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: seleccion.cuenta === null }}
                        style={[estilos.chip, seleccion.cuenta === null && estilos.chipActivo]}
                      >
                        <Text
                          style={[
                            estilos.chipTexto,
                            seleccion.cuenta === null && estilos.chipTextoActivo,
                          ]}
                        >
                          Nunca
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => cambiarSeleccion({ cuenta: seleccion.cuenta ?? 8 })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: seleccion.cuenta !== null }}
                        style={[estilos.chip, seleccion.cuenta !== null && estilos.chipActivo]}
                      >
                        <Text
                          style={[
                            estilos.chipTexto,
                            seleccion.cuenta !== null && estilos.chipTextoActivo,
                          ]}
                        >
                          Tras N veces
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {seleccion.cuenta !== null && (
                    <View style={estilos.filaControl}>
                      <Text style={estilos.controlEtiqueta}>Veces</Text>
                      <Stepper
                        valor={seleccion.cuenta}
                        onCambiar={ajustarCuenta}
                        estilos={estilos}
                      />
                    </View>
                  )}
                </>
              )}

              {esSerie && (
                <Text style={estilos.pista}>
                  Cambiar la repetición divide la serie desde hoy; lo anterior se conserva.
                </Text>
              )}
            </>
          )}

          {fecha && !esNota && hora !== '' && horaValida && (
            <Pressable
              onPress={() => setNivelAviso(((nivelAviso + 1) % 3) as NivelAviso)}
              accessibilityRole="button"
              accessibilityLabel={`Nivel de aviso ${ETIQUETA_AVISO[nivelAviso]}, tocar para cambiar`}
              style={estilos.aviso}
            >
              <Text style={estilos.avisoTexto}>{ETIQUETA_AVISO[nivelAviso]} ↺</Text>
            </Pressable>
          )}

          <Pressable
            onPress={guardar}
            accessibilityRole="button"
            disabled={guardarInactivo || recurrenciaInvalida}
            style={[
              estilos.guardar,
              (guardarInactivo || recurrenciaInvalida) && estilos.guardarInactivo,
            ]}
          >
            <Text style={estilos.guardarTexto}>Guardar cambios</Text>
          </Pressable>

          <Pressable
            onPress={onEliminar}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${item.titulo}`}
            style={estilos.eliminar}
          >
            <Text style={estilos.eliminarTexto}>Eliminar</Text>
          </Pressable>
        </ScrollView>
      </HojaInferior>

      <MenuAlcance
        visible={preguntandoAlcance}
        titulo={item.titulo}
        onElegir={aplicarAlcance}
        onCerrar={() => setPreguntandoAlcance(false)}
      />
    </>
  );
}

interface StepperProps {
  valor: number;
  sufijo?: string;
  onCambiar: (delta: number) => void;
  estilos: ReturnType<typeof crearEstilos>;
}

function Stepper({ valor, sufijo, onCambiar, estilos }: StepperProps) {
  return (
    <View style={estilos.stepper}>
      <Pressable
        onPress={() => onCambiar(-1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Restar"
        style={estilos.stepperBoton}
      >
        <Text style={estilos.stepperSigno}>−</Text>
      </Pressable>
      <Text style={estilos.stepperValor}>
        {valor}
        {sufijo ? ` ${sufijo}` : ''}
      </Text>
      <Pressable
        onPress={() => onCambiar(1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sumar"
        style={estilos.stepperBoton}
      >
        <Text style={estilos.stepperSigno}>+</Text>
      </Pressable>
    </View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    scroll: {
      paddingBottom: 4,
    },
    etiqueta: {
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    subetiqueta: {
      marginTop: 14,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiMedia,
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
    campoMultilinea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    campoError: {
      borderColor: paleta.ambar,
    },
    error: {
      marginTop: 6,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.ambar,
    },
    pista: {
      marginTop: 8,
      fontSize: 12.5,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      lineHeight: 18,
    },
    calendario: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      borderRadius: radios.pill,
      borderWidth: 1,
      borderColor: paleta.line,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minHeight: 40,
      justifyContent: 'center',
    },
    chipActivo: {
      backgroundColor: paleta.ink,
      borderColor: paleta.ink,
    },
    chipTexto: {
      fontSize: 13,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
    chipTextoActivo: {
      color: paleta.sobreInk,
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
    filaControl: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 10,
    },
    controlEtiqueta: {
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.pill,
      paddingHorizontal: 6,
      minHeight: 40,
    },
    stepperBoton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperSigno: {
      fontSize: 20,
      color: paleta.ink,
      lineHeight: 22,
    },
    stepperValor: {
      minWidth: 64,
      textAlign: 'center',
      fontSize: 13.5,
      fontFamily: fuente.uiMedia,
      color: paleta.ink,
    },
    aviso: {
      alignSelf: 'flex-start',
      marginTop: 14,
      backgroundColor: paleta.chipSuave,
      borderRadius: radios.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minHeight: 40,
      justifyContent: 'center',
    },
    avisoTexto: {
      fontSize: 13,
      fontFamily: fuente.uiMedia,
      color: paleta.evento,
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
    eliminar: {
      marginTop: 6,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eliminarTexto: {
      fontSize: 13.5,
      fontFamily: fuente.uiMedia,
      color: paleta.ambar,
    },
  });
