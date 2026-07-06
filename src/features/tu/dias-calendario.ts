// Días visibles del calendario de la pestaña Tú (funciones puras).
// Semana natural de lunes a domingo (coherente con periodos.ts y las
// rachas); la cuadrícula del mes se rellena a 6 semanas completas
// empezando en lunes, con marca `delMes` para atenuar el relleno.

import { lunesDeSemana } from '@/features/habitos/rachas';
import { aFechaISO, sumarDias } from '@/lib/fechas';

export interface CeldaMes {
  fecha: string; // YYYY-MM-DD
  delMes: boolean; // false = día de relleno del mes anterior/siguiente
}

/** Los 7 días (YYYY-MM-DD) de la semana natural del ancla, lunes→domingo. */
export function diasDeSemana(ancla: Date): string[] {
  const lunes = new Date(`${lunesDeSemana(ancla)}T00:00`);
  return Array.from({ length: 7 }, (_, i) => aFechaISO(sumarDias(lunes, i)));
}

/**
 * Cuadrícula del mes del ancla: 6 filas × 7 = 42 celdas, empezando en el
 * lunes de la semana que contiene el día 1. Cada celda marca si pertenece
 * al mes visible.
 */
export function diasDeCuadriculaMes(ancla: Date): CeldaMes[] {
  const mes = ancla.getMonth();
  const primero = new Date(ancla.getFullYear(), mes, 1);
  const inicio = new Date(`${lunesDeSemana(primero)}T00:00`);
  return Array.from({ length: 42 }, (_, i) => {
    const dia = sumarDias(inicio, i);
    return { fecha: aFechaISO(dia), delMes: dia.getMonth() === mes };
  });
}
