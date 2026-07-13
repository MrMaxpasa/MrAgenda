// Consulta compuesta del día: items simples desde SQL + series recurrentes
// expandidas por ventana, con excepciones aplicadas y estado por instancia.

import { excepcionesDeFecha, excepcionesEntre } from '@/db/repositorios/excepciones';
import {
  completadosDe,
  listarPendientesEntre,
  listarPorFecha,
  listarRecurrentes,
} from '@/db/repositorios/items';
import { ultimasSesionesDe } from '@/db/repositorios/sesiones';
import type { ConexionDB } from '@/db/tipos';
import { resumenUltimaMarca } from '@/features/deporte/marca';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { esDiaria } from '@/lib/recurrencia';

import { instanciasEnDia, type Instancia } from './instancias';

function horaDe(instancia: Instancia): string | null {
  const { item } = instancia;
  if (item.todo_el_dia || !item.fecha_inicio || item.fecha_inicio.length <= 10) return null;
  return item.fecha_inicio.slice(11, 16);
}

/**
 * Lo pendiente de una ventana de días para «Próximos 7 días»: ítems puntuales
 * más las series NO diarias, cada una en su día (docs/02 §4). Las diarias se
 * omiten —saldrían todos los días— y viven solo en Rutinas.
 *
 * Cuesta 4 consultas para toda la ventana, no 4 por día: los simples salen de
 * una consulta indexada, las series se expanden en memoria (son pocas) y las
 * excepciones y los completados se piden de golpe para todo el rango.
 */
export async function listarPendientesDeVentana(
  db: ConexionDB,
  desde: string,
  hasta: string,
): Promise<Instancia[]> {
  const [simples, recurrentes, excepciones] = await Promise.all([
    listarPendientesEntre(db, desde, hasta),
    listarRecurrentes(db),
    excepcionesEntre(db, desde, hasta),
  ]);

  const instancias: Instancia[] = simples.map((item) => ({
    item,
    fecha: item.fecha_inicio!.slice(0, 10),
    fechaOriginal: item.fecha_inicio!.slice(0, 10),
    hecha: false, // listarPendientesEntre ya filtra por estado
    progreso: null,
  }));

  const series = recurrentes.filter((item) => item.rrule && !esDiaria(item.rrule));
  const deSeries: Instancia[] = [];
  for (
    let dia = new Date(`${desde}T00:00`), fecha = desde;
    fecha <= hasta;
    dia = sumarDias(dia, 1), fecha = aFechaISO(dia)
  ) {
    for (const serie of series) {
      deSeries.push(...instanciasEnDia(serie, excepciones, fecha));
    }
  }

  const completados = await completadosDe(
    db,
    [...new Set(deSeries.map((i) => i.item.id))],
    [...new Set(deSeries.map((i) => i.fechaOriginal))],
  );
  const hechas = new Set(completados.map((c) => `${c.item_id}|${c.fecha}`));
  for (const instancia of deSeries) {
    if (!hechas.has(`${instancia.item.id}|${instancia.fechaOriginal}`)) instancias.push(instancia);
  }

  return instancias.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    const ha = horaDe(a);
    const hb = horaDe(b);
    if (ha !== null && hb !== null) return ha < hb ? -1 : ha > hb ? 1 : 0;
    if (ha !== null) return -1;
    if (hb !== null) return 1;
    return a.item.creado_en < b.item.creado_en ? -1 : 1;
  });
}

/** Todo lo que se ve en un día: con hora ordenado, día completo al final. */
export async function listarInstanciasPorFecha(
  db: ConexionDB,
  fecha: string,
): Promise<Instancia[]> {
  // recurrentes está acotado por nº de series (pequeño); excepciones, al día
  const [simples, recurrentes, excepciones] = await Promise.all([
    listarPorFecha(db, fecha),
    listarRecurrentes(db),
    excepcionesDeFecha(db, fecha),
  ]);

  // los ítems simples llevan su estado; las instancias recurrentes se resuelven
  // primero para saber qué (serie, fechaOriginal) consultar en `completados`
  const instancias: Instancia[] = simples.map((item) => ({
    item,
    fecha,
    fechaOriginal: item.fecha_inicio!.slice(0, 10),
    hecha: item.estado === 'hecho',
    progreso: null,
  }));

  const recurrentesDelDia: Instancia[] = [];
  for (const serie of recurrentes) {
    recurrentesDelDia.push(...instanciasEnDia(serie, excepciones, fecha));
  }

  // consulta dirigida de completados: solo los pares que vamos a mirar
  const idsRecurrentes = [...new Set(recurrentesDelDia.map((i) => i.item.id))];
  const fechasOriginales = [...new Set(recurrentesDelDia.map((i) => i.fechaOriginal))];
  const completados = await completadosDe(db, idsRecurrentes, fechasOriginales);
  const hechas = new Set(completados.map((c) => `${c.item_id}|${c.fecha}`));

  for (const instancia of recurrentesDelDia) {
    instancia.hecha = hechas.has(`${instancia.item.id}|${instancia.fechaOriginal}`);
    instancias.push(instancia);
  }

  // última marca: solo las sesiones de los entrenos presentes ese día
  const idsEntrenos = [
    ...new Set(instancias.filter((i) => i.item.tipo === 'entreno').map((i) => i.item.id)),
  ];
  const sesiones = await ultimasSesionesDe(db, idsEntrenos);
  for (const instancia of instancias) {
    if (instancia.item.tipo !== 'entreno') continue;
    const sesion = sesiones.get(instancia.item.id);
    if (sesion) {
      const resumen = resumenUltimaMarca(sesion);
      if (resumen) instancia.ultimaMarca = resumen;
    }
  }

  instancias.sort((a, b) => {
    const ha = horaDe(a);
    const hb = horaDe(b);
    if (ha !== null && hb !== null) return ha < hb ? -1 : ha > hb ? 1 : 0;
    if (ha !== null) return -1;
    if (hb !== null) return 1;
    return a.item.creado_en < b.item.creado_en ? -1 : 1;
  });

  return instancias;
}
