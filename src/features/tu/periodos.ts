// Periodos de la pestaña Tú (decisión de producto): naturales — semana de
// lunes a domingo, mes de calendario — alineados con el comodín semanal.

import { lunesDeSemana } from '@/features/habitos/rachas';
import { aFechaISO, sumarDias } from '@/lib/fechas';

export type Periodo = 'hoy' | 'semana' | 'mes';

export interface Rango {
  desde: string; // YYYY-MM-DD, incluido
  hasta: string; // YYYY-MM-DD, incluido
}

export function rangoDePeriodo(periodo: Periodo, ahora: Date): Rango {
  const hoy = aFechaISO(ahora);
  if (periodo === 'hoy') {
    return { desde: hoy, hasta: hoy };
  }
  if (periodo === 'semana') {
    const lunes = lunesDeSemana(ahora);
    return { desde: lunes, hasta: aFechaISO(sumarDias(new Date(`${lunes}T00:00`), 6)) };
  }
  const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimo = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  return { desde: aFechaISO(primero), hasta: aFechaISO(ultimo) };
}
