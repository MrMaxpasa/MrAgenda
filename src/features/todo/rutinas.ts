// Resumen de series recurrentes para la pestaña Todo: cada serie UNA vez,
// con su patrón en español y su próxima ocurrencia (funciones puras, sin DB).
// Reutiliza la expansión de recurrencias existente — aquí no se duplica lógica.

import type { Excepcion } from '@/db/repositorios/excepciones';
import type { Item } from '@/db/tipos';
import { progresoDe } from '@/features/items/instancias';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { descripcionRecurrencia, expandirEntre, totalInstancias } from '@/lib/recurrencia';

export interface ResumenRutina {
  item: Item;
  patron: string; // «cada martes», «cada día»…
  proxima: string | null; // YYYY-MM-DD en que se verá; null si ya no queda ninguna
  hora: string | null; // HH:mm, si la serie tiene hora
  progreso: { n: number; total: number } | null; // solo series con fin
  terminada: boolean; // serie con fin ya agotada
}

// Ventanas de búsqueda de la próxima ocurrencia: la corta cubre casi todo;
// la larga rescata las mensuales con intervalo grande sin expandirlas siempre.
const VENTANAS_DIAS = [60, 400];

/** Próxima ocurrencia visible de la serie: { mostrada, original } o null. */
function proximaOcurrencia(
  item: Item,
  excepciones: Excepcion[],
  hoyISO: string,
): { mostrada: string; original: string } | null {
  const propias = excepciones.filter((e) => e.item_id === item.id);

  // una instancia movida se ve en su destino, aunque su fecha natural ya pasara
  const movidas = propias
    .filter((e) => e.accion === 'mover' && e.nueva_fecha && e.nueva_fecha >= hoyISO)
    .map((e) => ({ mostrada: e.nueva_fecha!, original: e.fecha_original }));

  for (const dias of VENTANAS_DIAS) {
    const hasta = aFechaISO(sumarDias(new Date(`${hoyISO}T00:00`), dias));
    const naturales = expandirEntre(item.rrule!, item.fecha_inicio!, hoyISO, hasta)
      .filter((fecha) => !propias.some((e) => e.fecha_original === fecha))
      .map((fecha) => ({ mostrada: fecha, original: fecha }));

    const candidatas = [...naturales, ...movidas];
    if (candidatas.length > 0) {
      return candidatas.reduce((a, b) => (a.mostrada <= b.mostrada ? a : b));
    }
  }
  return null;
}

/**
 * Una fila por serie recurrente activa, ordenadas por su próxima ocurrencia.
 * Las series con fin ya agotadas van al final, marcadas como terminadas (no
 * desaparecen en silencio).
 */
export function resumirRutinas(
  series: Item[],
  excepciones: Excepcion[],
  hoyISO: string,
): ResumenRutina[] {
  const resumenes: ResumenRutina[] = [];

  for (const item of series) {
    if (!item.rrule || !item.fecha_inicio) continue;

    const proxima = proximaOcurrencia(item, excepciones, hoyISO);
    const total = totalInstancias(item.rrule);
    const conHora = !item.todo_el_dia && item.fecha_inicio.length > 10;

    resumenes.push({
      item,
      patron: descripcionRecurrencia(item.rrule, item.rrule_fin, { conFin: false }),
      proxima: proxima?.mostrada ?? null,
      hora: conHora ? item.fecha_inicio.slice(11, 16) : null,
      progreso: proxima
        ? progresoDe(item, proxima.original)
        : total
          ? { n: total, total }
          : null,
      terminada: !proxima && total !== null,
    });
  }

  return resumenes.sort((a, b) => {
    if (a.proxima && b.proxima) {
      if (a.proxima !== b.proxima) return a.proxima < b.proxima ? -1 : 1;
      return (a.hora ?? '99') < (b.hora ?? '99') ? -1 : 1;
    }
    if (a.proxima) return -1;
    if (b.proxima) return 1;
    return a.item.titulo.localeCompare(b.item.titulo);
  });
}
