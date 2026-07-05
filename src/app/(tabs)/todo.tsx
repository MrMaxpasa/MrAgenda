import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import * as items from '@/db/repositorios/items';
import { listarListas, type ListaResumen } from '@/db/repositorios/listas';
import type { Item } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { listarInstanciasPorFecha } from '@/features/items/consultas';
import type { Instancia } from '@/features/items/instancias';
import { DetalleLista } from '@/features/todo/detalle-lista';
import { DetalleNota } from '@/features/todo/detalle-nota';
import { FilaTodo } from '@/features/todo/fila-todo';
import { HojaReferencia } from '@/features/todo/hoja-referencia';
import { aFechaISO, formatearFechaLarga, sumarDias } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

type Categoria = 'listas' | 'notas' | 'referencia' | 'historial';

const CATEGORIAS: { clave: Categoria; etiqueta: string }[] = [
  { clave: 'listas', etiqueta: 'Listas' },
  { clave: 'notas', etiqueta: 'Notas' },
  { clave: 'referencia', etiqueta: 'Referencia' },
  { clave: 'historial', etiqueta: 'Historial' },
];

interface GrupoDia {
  fecha: string;
  etiqueta: string;
  instancias: Instancia[];
}

export default function PantallaTodo() {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const hoy = useMemo(() => new Date(), []);

  // ── próximos 7 días ──
  const [proximos, setProximos] = useState<GrupoDia[]>([]);
  useEffect(() => {
    let vivo = true;
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i + 1));
    Promise.all(dias.map((d) => listarInstanciasPorFecha(db, aFechaISO(d))))
      .then((porDia) => {
        if (!vivo) return;
        setProximos(
          porDia
            .map((instancias, i) => ({
              fecha: aFechaISO(dias[i]!),
              etiqueta: i === 0 ? `mañana · ${formatearFechaLarga(dias[i]!)}` : formatearFechaLarga(dias[i]!),
              instancias: instancias.filter((inst) => !inst.hecha),
            }))
            .filter((grupo) => grupo.instancias.length > 0),
        );
      })
      .catch((error) => console.error('[todo] error cargando próximos días:', error));
    return () => {
      vivo = false;
    };
  }, [db, hoy, version]);

  const completarInstancia = async (instancia: Instancia) => {
    await items.completar(db, instancia.item.id, instancia.fechaOriginal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refrescar();
  };

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
  const [categoria, setCategoria] = useState<Categoria>('listas');
  const [listas, setListas] = useState<ListaResumen[]>([]);
  const [itemsCategoria, setItemsCategoria] = useState<Item[]>([]);
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (categoria === 'listas') {
        const resumen = await listarListas(db);
        if (vivo) setListas(resumen);
      } else {
        const lista =
          categoria === 'historial'
            ? await items.listarHistorial(db)
            : await items.listarPorTipo(db, categoria === 'notas' ? 'nota' : 'referencia');
        if (vivo) setItemsCategoria(lista);
      }
    };
    cargar().catch((error) => console.error('[todo] error cargando categoría:', error));
    return () => {
      vivo = false;
    };
  }, [db, categoria, version]);

  // ── hojas ──
  const [listaAbierta, setListaAbierta] = useState<Item | null>(null);
  const [notaAbierta, setNotaAbierta] = useState<Item | null>(null);
  const [creandoReferencia, setCreandoReferencia] = useState(false);

  const abrirDetalle = (item: Item) => {
    if (item.tipo === 'lista') setListaAbierta(item);
    else if (item.tipo === 'nota' || item.tipo === 'referencia') setNotaAbierta(item);
  };

  const buscando = busqueda.trim().length >= 2;

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Todo</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {proximos.length > 0 && (
          <>
            <Text style={estilos.tituloSeccion}>Próximos 7 días</Text>
            {proximos.map((grupo) => (
              <View key={grupo.fecha}>
                <Text style={estilos.dia}>{grupo.etiqueta}</Text>
                {grupo.instancias.map((instancia) => (
                  <FilaTodo
                    key={`${instancia.item.id}|${instancia.fechaOriginal}`}
                    item={instancia.item}
                    hecha={false}
                    meta={
                      instancia.item.todo_el_dia || !instancia.item.fecha_inicio
                        ? 'cuando puedas'
                        : instancia.item.fecha_inicio.slice(11, 16)
                    }
                    onToggle={() => completarInstancia(instancia)}
                  />
                ))}
              </View>
            ))}
          </>
        )}

        <TextInput
          style={estilos.buscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar en todo…"
          placeholderTextColor={paleta.muted}
          accessibilityLabel="Buscador global"
        />

        {buscando ? (
          resultados.length > 0 ? (
            resultados.map((item) => (
              <FilaTodo
                key={item.id}
                item={item}
                meta={item.cuerpo ?? item.tipo}
                onPress={() => abrirDetalle(item)}
              />
            ))
          ) : (
            <Text style={estilos.sinResultados}>Nada con «{busqueda.trim()}» por ahora.</Text>
          )
        ) : (
          <>
            <View style={estilos.chips}>
              {CATEGORIAS.map(({ clave, etiqueta }) => (
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
                    {etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>

            {categoria === 'listas' &&
              (listas.length > 0 ? (
                listas.map((resumen) => (
                  <FilaTodo
                    key={resumen.item.id}
                    item={resumen.item}
                    meta={`${resumen.total - resumen.pendientes}/${resumen.total}`}
                    onPress={() => setListaAbierta(resumen.item)}
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
                    onPress={() => setNotaAbierta(item)}
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
                    onPress={() => setNotaAbierta(item)}
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

      {listaAbierta && <DetalleLista lista={listaAbierta} onCerrar={() => setListaAbierta(null)} />}
      {notaAbierta && <DetalleNota nota={notaAbierta} onCerrar={() => setNotaAbierta(null)} />}
      <HojaReferencia visible={creandoReferencia} onCerrar={() => setCreandoReferencia(false)} />
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
  tituloSeccion: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 2,
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
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
    marginTop: 18,
    marginBottom: 8,
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
    gap: 8,
    marginTop: 6,
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
    color: '#FFFFFF',
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
