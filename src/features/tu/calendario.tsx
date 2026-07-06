// Calendario navegable de la pestaña Tú: fila de 7 días (semana) o
// cuadrícula del mes. Cada celda muestra un matiz de lo que hay ese día
// (punto del color del tipo + título recortado en semana, solo puntos en
// mes) con «+N» si hay más. Sutil, docs/03: solo el punto lleva color.

import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorPorTipo } from '@/components/item-card';
import type { Instancia } from '@/features/items/instancias';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { diasDeCuadriculaMes, diasDeSemana } from './dias-calendario';
import type { MapaDias } from './use-dias-calendario';

const DIAS_CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export type Granularidad = 'semana' | 'mes';

interface Props {
  granularidad: Granularidad;
  ancla: Date;
  diaSeleccionado: string;
  hoyISO: string;
  mapa: MapaDias;
  onNavegar: (delta: number) => void;
  onSeleccionar: (fecha: string) => void;
}

function etiquetaPeriodo(granularidad: Granularidad, ancla: Date): string {
  if (granularidad === 'mes') return `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`;
  const dias = diasDeSemana(ancla);
  const ini = new Date(`${dias[0]}T00:00`);
  const fin = new Date(`${dias[6]}T00:00`);
  return `${ini.getDate()} ${MES_CORTO[ini.getMonth()]} – ${fin.getDate()} ${MES_CORTO[fin.getMonth()]}`;
}

export function Calendario({
  granularidad,
  ancla,
  diaSeleccionado,
  hoyISO,
  mapa,
  onNavegar,
  onSeleccionar,
}: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const celdas = useMemo(
    () =>
      granularidad === 'semana'
        ? diasDeSemana(ancla).map((fecha) => ({ fecha, delMes: true }))
        : diasDeCuadriculaMes(ancla),
    [granularidad, ancla],
  );

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.navegacion}>
        <Pressable
          onPress={() => onNavegar(-1)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Periodo anterior"
          style={estilos.flecha}
        >
          <Text style={estilos.flechaTexto}>‹</Text>
        </Pressable>
        <Text style={estilos.etiqueta}>{etiquetaPeriodo(granularidad, ancla)}</Text>
        <Pressable
          onPress={() => onNavegar(1)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Periodo siguiente"
          style={estilos.flecha}
        >
          <Text style={estilos.flechaTexto}>›</Text>
        </Pressable>
      </View>

      <View style={estilos.cabeceraDias}>
        {DIAS_CABECERA.map((d, i) => (
          <Text key={i} style={estilos.cabeceraDia}>
            {d}
          </Text>
        ))}
      </View>

      <View style={estilos.rejilla}>
        {celdas.map(({ fecha, delMes }) => (
          <CeldaDia
            key={fecha}
            fecha={fecha}
            instancias={mapa.get(fecha) ?? []}
            granularidad={granularidad}
            esHoy={fecha === hoyISO}
            seleccionado={fecha === diaSeleccionado}
            delMes={delMes}
            estilos={estilos}
            paleta={paleta}
            onPress={() => onSeleccionar(fecha)}
          />
        ))}
      </View>
    </View>
  );
}

interface CeldaProps {
  fecha: string;
  instancias: Instancia[];
  granularidad: Granularidad;
  esHoy: boolean;
  seleccionado: boolean;
  delMes: boolean;
  estilos: ReturnType<typeof crearEstilos>;
  paleta: Colores;
  onPress: () => void;
}

function CeldaDia({
  fecha,
  instancias,
  granularidad,
  esHoy,
  seleccionado,
  delMes,
  estilos,
  paleta,
  onPress,
}: CeldaProps) {
  const numero = Number(fecha.slice(8));
  const maxItems = granularidad === 'semana' ? 2 : 3;
  const visibles = instancias.slice(0, maxItems);
  const extra = instancias.length - visibles.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Día ${numero}, ${instancias.length} cosas`}
      style={[
        granularidad === 'semana' ? estilos.celdaSemana : estilos.celdaMes,
        seleccionado && estilos.celdaSeleccionada,
      ]}
    >
      <View style={[estilos.numeroContenedor, esHoy && estilos.numeroHoy]}>
        <Text
          style={[
            estilos.numero,
            esHoy && estilos.numeroTextoHoy,
            !delMes && estilos.numeroFuera,
          ]}
        >
          {numero}
        </Text>
      </View>

      {granularidad === 'semana' ? (
        <View style={estilos.itemsSemana}>
          {visibles.map((inst) => (
            <View key={`${inst.item.id}|${inst.fechaOriginal}`} style={estilos.filaItem}>
              <View
                style={[estilos.punto, { backgroundColor: colorPorTipo(inst.item.tipo, paleta) }]}
              />
              <Text style={estilos.itemTitulo} numberOfLines={1}>
                {inst.item.titulo}
              </Text>
            </View>
          ))}
          {extra > 0 && <Text style={estilos.masN}>+{extra}</Text>}
        </View>
      ) : (
        <View style={estilos.puntosMes}>
          {visibles.map((inst) => (
            <View
              key={`${inst.item.id}|${inst.fechaOriginal}`}
              style={[estilos.puntoMes, { backgroundColor: colorPorTipo(inst.item.tipo, paleta) }]}
            />
          ))}
          {extra > 0 && <Text style={estilos.masNMes}>+{extra}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    contenedor: {
      marginTop: 6,
    },
    navegacion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    flecha: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flechaTexto: {
      fontSize: 26,
      color: paleta.ink,
      lineHeight: 28,
    },
    etiqueta: {
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiMedia,
      color: paleta.ink,
    },
    cabeceraDias: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    cabeceraDia: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
    rejilla: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    celdaSemana: {
      width: `${100 / 7}%`,
      minHeight: 80,
      padding: 3,
      borderRadius: 10,
    },
    celdaMes: {
      width: `${100 / 7}%`,
      minHeight: 52,
      padding: 3,
      borderRadius: 8,
      alignItems: 'center',
    },
    celdaSeleccionada: {
      backgroundColor: paleta.fog,
      borderWidth: 1,
      borderColor: paleta.line,
    },
    numeroContenedor: {
      alignSelf: 'center',
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numeroHoy: {
      backgroundColor: paleta.ink,
    },
    numero: {
      fontSize: 13,
      fontFamily: fuente.uiMedia,
      color: paleta.ink,
    },
    numeroTextoHoy: {
      color: paleta.sobreInk,
    },
    numeroFuera: {
      color: paleta.done,
    },
    itemsSemana: {
      marginTop: 3,
      gap: 2,
    },
    filaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    punto: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    itemTitulo: {
      flex: 1,
      fontSize: 9.5,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
    },
    masN: {
      fontSize: 9.5,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
      marginTop: 1,
    },
    puntosMes: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 4,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    puntoMes: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    masNMes: {
      fontSize: 8.5,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
  });
