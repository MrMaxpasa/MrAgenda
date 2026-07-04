// Motor de rachas con comodín semanal (docs/02 §5). Función pura: la racha
// se DERIVA por completo del historial de `completados` — sin estado
// mutable que sincronizar (la columna comodines_usados_semana del esquema
// queda sin uso a propósito).
//
// Reglas:
// - Solo cuentan los días activos del hábito ('diario' o días concretos).
// - Hoy pendiente no rompe: aún se puede hacer.
// - Una falta por semana natural (lunes–domingo) la cubre el comodín;
//   la segunda falta de la misma semana rompe la racha.

import { aFechaISO, sumarDias } from '@/lib/fechas';

export type DiasHabito = 'diario' | number[]; // días JS: 0=domingo … 6=sábado

export interface Racha {
  actual: number;
  record: number;
  comodinUsadoEstaSemana: boolean;
}

function esActivo(fecha: Date, dias: DiasHabito): boolean {
  return dias === 'diario' || dias.includes(fecha.getDay());
}

/** Lunes de la semana natural de la fecha (YYYY-MM-DD). */
export function lunesDeSemana(fecha: Date): string {
  const diasDesdeLunes = (fecha.getDay() + 6) % 7; // lunes=0 … domingo=6
  return aFechaISO(sumarDias(fecha, -diasDesdeLunes));
}

export function calcularRacha(hechas: Set<string>, dias: DiasHabito, hoy: string): Racha {
  if (hechas.size === 0) return { actual: 0, record: 0, comodinUsadoEstaSemana: false };

  const primera = [...hechas].sort()[0]!;
  const fin = new Date(`${hoy}T00:00`);
  const semanaActual = lunesDeSemana(fin);
  const comodinPorSemana = new Set<string>(); // semanas con el comodín gastado

  let racha = 0;
  let record = 0;
  let comodinUsadoEstaSemana = false;

  for (
    let fecha = new Date(`${primera}T00:00`);
    fecha <= fin;
    fecha = sumarDias(fecha, 1)
  ) {
    if (!esActivo(fecha, dias)) continue;
    const iso = aFechaISO(fecha);

    if (hechas.has(iso)) {
      racha++;
    } else if (iso === hoy) {
      // pendiente de hoy: ni suma ni rompe
    } else {
      const semana = lunesDeSemana(fecha);
      if (!comodinPorSemana.has(semana)) {
        comodinPorSemana.add(semana); // el comodín cubre esta falta
        if (semana === semanaActual) comodinUsadoEstaSemana = true;
      } else {
        racha = 0; // segunda falta de la semana: se rompe, sin drama
      }
    }
    if (racha > record) record = racha;
  }

  // el flag solo importa si la racha sigue viva
  if (racha === 0) comodinUsadoEstaSemana = comodinPorSemana.has(semanaActual);

  return { actual: racha, record, comodinUsadoEstaSemana };
}
