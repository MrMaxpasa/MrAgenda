// Instancias de series recurrentes: funciones puras que expanden un ítem
// con RRULE a los días concretos donde debe aparecer, aplicando las
// excepciones («solo esta») y calculando el progreso «5 de 8».

import type { Excepcion } from '@/db/repositorios/excepciones';
import type { Item } from '@/db/tipos';
import { contarInstanciasHasta, expandirEntre, totalInstancias } from '@/lib/recurrencia';

export interface Instancia {
  item: Item;
  fecha: string; // día en que se muestra (YYYY-MM-DD)
  fechaOriginal: string; // fecha según la serie: clave de completados/excepciones
  hecha: boolean;
  progreso: { n: number; total: number } | null;
}

/** Progreso «n de total» de una instancia en una serie con fin; null si es infinita. */
export function progresoDe(item: Item, fechaOriginal: string): { n: number; total: number } | null {
  if (!item.rrule || !item.fecha_inicio) return null;
  const total = totalInstancias(item.rrule);
  if (!total) return null;
  const n = contarInstanciasHasta(item.rrule, item.fecha_inicio, fechaOriginal);
  return n >= 1 && n <= total ? { n, total } : null;
}

/**
 * Instancias de un ítem recurrente que se ven en el día dado: las naturales
 * de la serie no excepcionadas más las movidas hasta ese día. `hecha` la
 * rellena el repositorio cruzando con `completados`.
 */
export function instanciasEnDia(item: Item, excepciones: Excepcion[], fecha: string): Instancia[] {
  if (!item.rrule || !item.fecha_inicio) return [];
  const propias = excepciones.filter((e) => e.item_id === item.id);
  const fechasOriginales: string[] = [];

  for (const natural of expandirEntre(item.rrule, item.fecha_inicio, fecha, fecha)) {
    const excepcionada = propias.some((e) => e.fecha_original === natural);
    if (!excepcionada) fechasOriginales.push(natural);
  }
  for (const e of propias) {
    if (e.accion === 'mover' && e.nueva_fecha === fecha) {
      fechasOriginales.push(e.fecha_original);
    }
  }

  return fechasOriginales.map((fechaOriginal) => ({
    item,
    fecha,
    fechaOriginal,
    hecha: false,
    progreso: progresoDe(item, fechaOriginal),
  }));
}
