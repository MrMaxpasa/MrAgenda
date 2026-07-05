// Revisión semanal (docs/02 §6): resumen tipo Wrapped en miniatura con
// comparativa frente a la semana anterior, y el índice de consistencia
// (hechas / previstas del periodo, items + hábitos), sin ránkings.

import { listarHabitos } from '@/db/repositorios/habitos';
import { completadosEntre, listarCompletados } from '@/db/repositorios/items';
import type { ConexionDB } from '@/db/tipos';
import { construirHabitosDeHoy } from '@/features/habitos/del-dia';
import { listarInstanciasPorFecha } from '@/features/items/consultas';
import { aFechaISO, sumarDias } from '@/lib/fechas';

import { rangoDePeriodo, type Rango } from './periodos';

/**
 * % de lo previsto que se hizo en el rango (solo días ya transcurridos):
 * instancias del día + hábitos activos. null si no había nada previsto.
 */
export async function calcularConsistencia(
  db: ConexionDB,
  rango: Rango,
  hoyISO: string,
): Promise<number | null> {
  const [habitos, completados] = await Promise.all([listarHabitos(db), listarCompletados(db)]);

  let hechas = 0;
  let total = 0;
  const hasta = rango.hasta < hoyISO ? rango.hasta : hoyISO;

  for (
    let fecha = new Date(`${rango.desde}T00:00`);
    aFechaISO(fecha) <= hasta;
    fecha = sumarDias(fecha, 1)
  ) {
    const iso = aFechaISO(fecha);
    const instancias = await listarInstanciasPorFecha(db, iso);
    for (const instancia of instancias) {
      total++;
      if (instancia.hecha) hechas++;
    }
    for (const habito of construirHabitosDeHoy(habitos, completados, iso)) {
      total++;
      if (habito.hechaHoy) hechas++;
    }
  }

  return total === 0 ? null : Math.round((100 * hechas) / total);
}

export interface ResumenSemanal {
  completadas: number;
  entrenos: number;
  mejorRacha: { titulo: string; icono: string; dias: number } | null;
  consistencia: number | null;
  deltaCompletadas: number;
  deltaEntrenos: number;
  deltaConsistencia: number | null;
}

export async function resumenSemanal(db: ConexionDB, ahora: Date): Promise<ResumenSemanal> {
  const hoyISO = aFechaISO(ahora);
  const actual = rangoDePeriodo('semana', ahora);
  const previa = rangoDePeriodo('semana', sumarDias(ahora, -7));

  const [deActual, dePrevia, habitos, completados] = await Promise.all([
    completadosEntre(db, actual.desde, actual.hasta),
    completadosEntre(db, previa.desde, previa.hasta),
    listarHabitos(db),
    listarCompletados(db),
  ]);

  const habitosHoy = construirHabitosDeHoy(habitos, completados, hoyISO);
  const mejor = [...habitosHoy].sort((a, b) => b.racha.actual - a.racha.actual)[0];

  const consistencia = await calcularConsistencia(db, actual, hoyISO);
  const consistenciaPrevia = await calcularConsistencia(db, previa, hoyISO);

  const entrenos = deActual.filter((c) => c.tipo === 'entreno').length;
  const entrenosPrevios = dePrevia.filter((c) => c.tipo === 'entreno').length;

  return {
    completadas: deActual.length,
    entrenos,
    mejorRacha:
      mejor && mejor.racha.actual > 0
        ? { titulo: mejor.habito.item.titulo, icono: mejor.habito.icono, dias: mejor.racha.actual }
        : null,
    consistencia,
    deltaCompletadas: deActual.length - dePrevia.length,
    deltaEntrenos: entrenos - entrenosPrevios,
    deltaConsistencia:
      consistencia !== null && consistenciaPrevia !== null
        ? consistencia - consistenciaPrevia
        : null,
  };
}

/** «↑ +3» · «↓ −2» · «= igual» — comparativa sin drama. */
export function textoDelta(delta: number | null, unidad = ''): string {
  if (delta === null || delta === 0) return '= como la semana pasada';
  const flecha = delta > 0 ? '↑' : '↓';
  const signo = delta > 0 ? '+' : '−';
  return `${flecha} ${signo}${Math.abs(delta)}${unidad} vs semana pasada`;
}
