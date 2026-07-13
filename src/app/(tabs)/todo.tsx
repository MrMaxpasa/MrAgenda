import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { listarExcepciones } from '@/db/repositorios/excepciones';
import * as items from '@/db/repositorios/items';
import { listarListas, type ListaResumen } from '@/db/repositorios/listas';
import type { Item } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { useTiendaEditor } from '@/features/items/tienda-editor';
import { FilaTodo } from '@/features/todo/fila-todo';
import { HojaReferencia } from '@/features/todo/hoja-referencia';
import { resumirRutinas, type ResumenRutina } from '@/features/todo/rutinas';
import { aFechaISO, nombreDiaSemana, sumarDias } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

type Categoria = 'rutinas' | 'tareas' | 'listas' | 'notas' | 'referencia' | 'historial';

const CATEGORIAS: { clave: Categoria; etiqueta: string }[] = [
  { clave: 'rutinas', etiqueta: 'Rutinas' },
  { clave: 'tareas', etiqueta: 'Tareas' },
  { clave: 'listas', etiqueta: 'Listas' },
  { clave: 'notas', etiqueta: 'Notas' },
  { clave: 'referencia', etiqueta: 'Referencia' },
  { clave: 'historial', etiqueta: 'Historial' },
];

const DIAS_VENTANA = 7; // «Próximos 7 días» = hoy + los 6 siguientes

/** «Hoy», «Mañana» o «jueves 17» — etiquetas escaneables de un vistazo. */
function etiquetaDia(fechaISO: string, hoyISO: string): string {
  if (fechaISO === hoyISO) return 'Hoy';
  const fecha = new Date(`${fechaISO}T00:00`);
  if (fechaISO === aFechaISO(sumarDias(new Date(`${hoyISO}T00:00`), 1))) return 'Mañana';
  return `${nombreDiaSemana(fecha)} ${fecha.getDate()}`;
}

function metaDeSuelta(item: Item): string {
  if (!item.fecha_inicio) return 'sin fecha — cuando quieras';
  const fecha = new Date(`${item.fecha_inicio.slice(0, 10)}T00:00`);
  return `te esperaba el ${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

function metaDeFecha(item: Item): string {
  if (item.todo_el_dia || !item.fecha_inicio || item.fecha_inicio.length <= 10) return 'cuando puedas';
  return item.fecha_inicio.slice(11, 16);
}

/** «cada jueves · próxima: jueves 17 · 19:00 · 5 de 8» */
function metaDeRutina(rutina: ResumenRutina, hoyISO: string): string {
  const partes = [rutina.patron];
  if (rutina.terminada) {
    partes.push('completada');
  } else if (rutina.proxima) {
    partes.push(`próxima: ${etiquetaDia(rutina.proxima, hoyISO).toLowerCase()}`);
    if (rutina.hora) partes.push(rutina.hora);
  }
  if (rutina.progreso) partes.push(`${rutina.progreso.n} de ${rutina.progreso.total}`);
  return partes.join(' · ');
}

/** Cabecera de sección: eyebrow a la izquierda, contador discreto a la derecha. */
function Cabecera({ titulo, contador }: { titulo: string; contador?: string }) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  return (
    <View style={estilos.cabeceraSeccion}>
      <Text style={estilos.tituloSeccion}>{titulo}</Text>
      {contador ? <Text style={estilos.contador}>{contador}</Text> : null}
    </View>
  );
}

interface GrupoDia {
  fecha: string;
  items: Item[];
}

interface GrupoBusqueda {
  etiqueta: string;
  items: Item[];
}

/** Resultados del buscador agrupados por tipo, en orden de utilidad. */
function agruparResultados(resultados: Item[]): GrupoBusqueda[] {
  const grupos: GrupoBusqueda[] = [
    { etiqueta: 'Tareas y eventos', items: [] },
    { etiqueta: 'Notas', items: [] },
    { etiqueta: 'Listas', items: [] },
    { etiqueta: 'Referencia', items: [] },
  ];
  for (const item of resultados) {
    if (item.tipo === 'nota') grupos[1]!.items.push(item);
    else if (item.tipo === 'lista') grupos[2]!.items.push(item);
    else if (item.tipo === 'referencia') grupos[3]!.items.push(item);
    else if (item.tipo !== 'habito') grupos[0]!.items.push(item);
  }
  return grupos.filter((grupo) => grupo.items.length > 0);
}

export default function PantallaTodo() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const abrir = useTiendaEditor((estado) => estado.abrir);
  const hoy = useMemo(() => new Date(), []);
  const hoyISO = useMemo(() => aFechaISO(hoy), [hoy]);

  // ── próximos 7 días: solo ítems puntuales; las series viven en Rutinas ──
  const [proximos, setProximos] = useState<GrupoDia[]>([]);
  useEffect(() => {
    let vivo = true;
    const hasta = aFechaISO(sumarDias(hoy, DIAS_VENTANA - 1));
    items
      .listarPendientesEntre(db, hoyISO, hasta)
      .then((pendientes) => {
        if (!vivo) return;
        const porDia = new Map<string, Item[]>();
        for (const item of pendientes) {
          const dia = item.fecha_inicio!.slice(0, 10);
          const grupo = porDia.get(dia);
          if (grupo) grupo.push(item);
          else porDia.set(dia, [item]);
        }
        setProximos([...porDia].map(([fecha, itemsDelDia]) => ({ fecha, items: itemsDelDia })));
      })
      .catch((error) => console.error('[todo] error cargando próximos días:', error));
    return () => {
      vivo = false;
    };
  }, [db, hoy, hoyISO, version]);

  // ── contadores de los chips ──
  const [conteo, setConteo] = useState<items.ConteoCategorias | null>(null);
  useEffect(() => {
    let vivo = true;
    items
      .contarPorCategoria(db, hoyISO)
      .then((resultado) => {
        if (vivo) setConteo(resultado);
      })
      .catch((error) => console.error('[todo] error contando categorías:', error));
    return () => {
      vivo = false;
    };
  }, [db, hoyISO, version]);

  // ── buscador global ──
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Item[]>([]);
  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    let vivo = true;
    const temporizador = setTimeout(() => {
      items
        .buscar(db, busqueda.trim())
        .then((encontrados) => {
          if (vivo) setResultados(encontrados);
        })
        .catch(() => setResultados([]));
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [db, busqueda, version]);

  // ── categorías ──
  const [categoria, setCategoria] = useState<Categoria>('tareas');
  const [listas, setListas] = useState<ListaResumen[]>([]);
  const [rutinas, setRutinas] = useState<ResumenRutina[]>([]);
  const [itemsCategoria, setItemsCategoria] = useState<Item[]>([]);
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (categoria === 'listas') {
        const resumen = await listarListas(db);
        if (vivo) setListas(resumen);
      } else if (categoria === 'rutinas') {
        const [series, excepciones] = await Promise.all([
          items.listarRecurrentes(db),
          listarExcepciones(db),
        ]);
        if (vivo) setRutinas(resumirRutinas(series, excepciones, hoyISO));
      } else {
        const lista =
          categoria === 'tareas'
            ? await items.listarTareasSueltas(db, hoyISO)
            : categoria === 'historial'
              ? await items.listarHistorial(db)
              : await items.listarPorTipo(db, categoria === 'notas' ? 'nota' : 'referencia');
        if (vivo) setItemsCategoria(lista);
      }
    };
    cargar().catch((error) => console.error('[todo] error cargando categoría:', error));
    return () => {
      vivo = false;
    };
  }, [db, categoria, hoyISO, version]);

  const completarSuelta = async (item: Item) => {
    await items.completar(db, item.id, item.fecha_inicio?.slice(0, 10) ?? hoyISO);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refrescar();
  };

  // ── hojas ──
  const [creandoReferencia, setCreandoReferencia] = useState(false);

  const buscando = busqueda.trim().length >= 2;
  const grupos = useMemo(() => agruparResultados(resultados), [resultados]);

  const vencidas = itemsCategoria.filter((item) => item.fecha_inicio);
  const sinFecha = itemsCategoria.filter((item) => !item.fecha_inicio);

  const contadorDeChip = (clave: Categoria): number | null => {
    if (!conteo || clave === 'historial') return null;
    const n = conteo[clave];
    return n > 0 ? n : null;
  };

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Todo</Text>
      </View>

      <TextInput
        style={estilos.buscador}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar en todo…"
        placeholderTextColor={paleta.muted}
        accessibilityLabel="Buscador global"
      />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {buscando ? (
          grupos.length > 0 ? (
            grupos.map((grupo) => (
              <View key={grupo.etiqueta}>
                <Cabecera titulo={grupo.etiqueta} contador={`${grupo.items.length}`} />
                {grupo.items.map((item) => (
                  <FilaTodo
                    key={item.id}
                    item={item}
                    meta={item.cuerpo ?? undefined}
                    onPress={() => abrir(item)}
                  />
                ))}
              </View>
            ))
          ) : (
            <Text style={estilos.sinResultados}>Nada con «{busqueda.trim()}» por ahora.</Text>
          )
        ) : (
          <>
            {proximos.length > 0 && (
              <>
                <Cabecera titulo="Próximos 7 días" />
                {proximos.map((grupo) => (
                  <View key={grupo.fecha}>
                    <Text style={estilos.dia}>{etiquetaDia(grupo.fecha, hoyISO)}</Text>
                    {grupo.items.map((item) => (
                      <FilaTodo
                        key={item.id}
                        item={item}
                        hecha={false}
                        meta={metaDeFecha(item)}
                        onPress={() => abrir(item)}
                        onToggle={() => completarSuelta(item)}
                      />
                    ))}
                  </View>
                ))}
              </>
            )}

            <View style={estilos.chips}>
              {CATEGORIAS.map(({ clave, etiqueta }) => {
                const n = contadorDeChip(clave);
                return (
                  <Pressable
                    key={clave}
                    onPress={() => setCategoria(clave)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: categoria === clave }}
                    style={[estilos.chip, categoria === clave && estilos.chipActivo]}
                  >
                    <Text
                      style={[estilos.chipTexto, categoria === clave && estilos.chipTextoActivo]}
                    >
                      {n ? `${etiqueta} · ${n}` : etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {categoria === 'rutinas' &&
              (rutinas.length > 0 ? (
                rutinas.map((rutina) => (
                  <FilaTodo
                    key={rutina.item.id}
                    item={rutina.item}
                    hecha={rutina.terminada}
                    meta={metaDeRutina(rutina, hoyISO)}
                    onPress={() => abrir(rutina.item, rutina.proxima ?? undefined)}
                  />
                ))
              ) : (
                <EstadoVacio mensaje="Di «colada cada martes» en la captura y tus rutinas se ordenarán aquí, una sola vez." />
              ))}

            {categoria === 'tareas' &&
              (itemsCategoria.length > 0 ? (
                <>
                  {vencidas.length > 0 && (
                    <>
                      <Text style={estilos.dia}>Vencidas</Text>
                      {vencidas.map((item) => (
                        <FilaTodo
                          key={item.id}
                          item={item}
                          hecha={false}
                          meta={metaDeSuelta(item)}
                          onPress={() => abrir(item)}
                          onToggle={() => completarSuelta(item)}
                        />
                      ))}
                    </>
                  )}
                  {sinFecha.length > 0 && (
                    <>
                      <Text style={estilos.dia}>Cuando puedas</Text>
                      {sinFecha.map((item) => (
                        <FilaTodo
                          key={item.id}
                          item={item}
                          hecha={false}
                          meta={metaDeSuelta(item)}
                          onPress={() => abrir(item)}
                          onToggle={() => completarSuelta(item)}
                        />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <EstadoVacio mensaje="Sin tareas sueltas: lo que captures sin fecha esperará aquí." />
              ))}

            {categoria === 'listas' &&
              (listas.length > 0 ? (
                listas.map((resumen) => (
                  <FilaTodo
                    key={resumen.item.id}
                    item={resumen.item}
                    meta={`${resumen.total - resumen.pendientes}/${resumen.total}`}
                    onPress={() => abrir(resumen.item)}
                  />
                ))
              ) : (
                <EstadoVacio mensaje="Di «añade pan a la compra» en la captura y tu primera lista aparecerá aquí." />
              ))}

            {categoria === 'notas' &&
              (itemsCategoria.length > 0 ? (
                itemsCategoria.map((item) => (
                  <FilaTodo
                    key={item.id}
                    item={item}
                    meta={item.cuerpo ?? undefined}
                    onPress={() => abrir(item)}
                  />
                ))
              ) : (
                <EstadoVacio mensaje="Las notas que captures vivirán aquí." />
              ))}

            {categoria === 'referencia' && (
              <>
                <Pressable
                  onPress={() => setCreandoReferencia(true)}
                  accessibilityRole="button"
                  style={estilos.nuevaReferencia}
                >
                  <Text style={estilos.nuevaReferenciaTexto}>+ Nueva referencia</Text>
                </Pressable>
                {itemsCategoria.map((item) => (
                  <FilaTodo
                    key={item.id}
                    item={item}
                    meta={item.cuerpo ?? undefined}
                    onPress={() => abrir(item)}
                  />
                ))}
                {itemsCategoria.length === 0 && (
                  <EstadoVacio mensaje="Tallas, matrículas, wifi… lo que buscas 3 veces al año, siempre a mano." />
                )}
              </>
            )}

            {categoria === 'historial' &&
              (itemsCategoria.length > 0 ? (
                itemsCategoria.map((item) => (
                  <FilaTodo
                    key={item.id}
                    item={item}
                    meta={item.estado === 'archivado' ? 'archivado' : 'hecho'}
                  />
                ))
              ) : (
                <EstadoVacio mensaje="Lo que completes irá quedando aquí." />
              ))}
          </>
        )}
      </ScrollView>

      <HojaReferencia visible={creandoReferencia} onCerrar={() => setCreandoReferencia(false)} />
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
  cabeceraSeccion: {
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  tituloSeccion: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  contador: {
    fontSize: 12,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
  dia: {
    marginTop: 10,
    paddingHorizontal: 2,
    fontSize: 12,
    fontFamily: fuente.uiSemi,
    color: paleta.evento,
  },
  buscador: {
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: paleta.line,
    borderRadius: radios.campo,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
    backgroundColor: paleta.card,
  },
  sinResultados: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  chip: {
    borderRadius: radios.pill,
    borderWidth: 1,
    borderColor: paleta.line,
    paddingVertical: 7,
    paddingHorizontal: 13,
    minHeight: 34,
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
  nuevaReferencia: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  nuevaReferenciaTexto: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
    color: paleta.evento,
  },
});
