// Panel que despliega el día tocado en el calendario. Hoy/futuro → su
// agenda planeada; pasado → lo que hubo y qué se cumplió (histórico). Lee
// del mapa ya cargado (sin consulta extra) y reutiliza FilaTodo en lectura.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Instancia } from '@/features/items/instancias';
import { FilaTodo } from '@/features/todo/fila-todo';
import { formatearFechaLarga } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  fecha: string; // YYYY-MM-DD seleccionado
  hoyISO: string;
  instancias: Instancia[];
}

function relativo(fecha: string, hoyISO: string): string | null {
  const dias = Math.round(
    (new Date(`${fecha}T00:00`).getTime() - new Date(`${hoyISO}T00:00`).getTime()) / 86_400_000,
  );
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return null;
}

function metaDe(inst: Instancia): string {
  const { item } = inst;
  if (!item.todo_el_dia && item.fecha_inicio && item.fecha_inicio.length > 10) {
    return item.fecha_inicio.slice(11, 16);
  }
  return 'cuando puedas';
}

export function PanelDia({ fecha, hoyISO, instancias }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const esPasado = fecha < hoyISO;
  const rel = relativo(fecha, hoyISO);
  const cabecera = formatearFechaLarga(new Date(`${fecha}T00:00`));

  return (
    <View style={estilos.panel}>
      <View style={estilos.cabecera}>
        <Text style={estilos.fecha}>{cabecera}</Text>
        {rel && <Text style={estilos.relativo}>{rel}</Text>}
      </View>

      <Text style={estilos.seccion}>{esPasado ? 'Ese día' : 'Tu agenda'}</Text>

      {instancias.length === 0 ? (
        <Text style={estilos.vacio}>
          {esPasado ? 'No había nada anotado ese día.' : 'Nada planeado — día libre.'}
        </Text>
      ) : (
        instancias.map((inst) => (
          <FilaTodo
            key={`${inst.item.id}|${inst.fechaOriginal}`}
            item={inst.item}
            hecha={inst.hecha}
            meta={metaDe(inst)}
          />
        ))
      )}
    </View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    panel: {
      marginTop: 14,
      backgroundColor: paleta.card,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    fecha: {
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiMedia,
      color: paleta.ink,
      textTransform: 'capitalize',
    },
    relativo: {
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
    },
    seccion: {
      marginTop: 10,
      marginBottom: 2,
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    vacio: {
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      paddingVertical: 10,
    },
  });
