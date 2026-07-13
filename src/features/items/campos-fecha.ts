// Cómo se guarda «cuándo» un ítem, en un solo sitio: lo usan la hoja de captura
// y el editor universal.
//
// REGLA DE PRODUCTO: una nota (o una referencia) nunca lleva hora — algo que
// ocurre a una hora es un evento o una tarea. Una nota sí puede tener día: se
// guarda como día completo.

import type { TipoItem } from '@/db/tipos';

export interface CamposFecha {
  fecha_inicio: string | null;
  todo_el_dia: boolean;
}

/** ¿Este tipo admite hora? */
export function admiteHora(tipo: TipoItem): boolean {
  return tipo !== 'nota' && tipo !== 'referencia' && tipo !== 'lista';
}

/**
 * `fecha` es YYYY-MM-DD y `hora` HH:mm (o null). Sin fecha no hay hora que
 * valga: el ítem queda sin fecha_inicio.
 */
export function camposDeFecha(
  tipo: TipoItem,
  fecha: string | null,
  hora: string | null,
): CamposFecha {
  if (!fecha) return { fecha_inicio: null, todo_el_dia: false };
  if (hora && admiteHora(tipo)) return { fecha_inicio: `${fecha}T${hora}`, todo_el_dia: false };
  return { fecha_inicio: fecha, todo_el_dia: true };
}
