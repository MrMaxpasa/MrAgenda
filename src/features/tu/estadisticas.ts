// Estadísticas de la pestaña Tú: se calculan según el periodo elegido.
// Sin ránkings ni presión (docs/01): números que orientan, no que juzgan.

import { listarHabitos, type Habito } from '@/db/repositorios/habitos';
import { completadosEntre, listarCompletados } from '@/db/repositorios/items';
import type { ConexionDB } from '@/db/tipos';
import { calcularRacha, type Racha } from '@/features/habitos/rachas';

import type { Rango } from './periodos';

export interface RachaDeHabito {
  habito: Habito;
  racha: Racha;
}

export interface Estadisticas {
  completadas: number; // todo lo completado en el rango
  entrenos: number; // completados de tipo entreno en el rango
  rachas: RachaDeHabito[]; // rachas activas, de mayor a menor
  mejorRecord: RachaDeHabito | null; // el récord histórico más alto
}

export async function estadisticasDePeriodo(
  db: ConexionDB,
  rango: Rango,
  hoyISO: string,
): Promise<Estadisticas> {
  const [delRango, habitos, todosLosCompletados] = await Promise.all([
    completadosEntre(db, rango.desde, rango.hasta),
    listarHabitos(db),
    listarCompletados(db),
  ]);

  const porHabito = new Map<string, Set<string>>();
  for (const c of todosLosCompletados) {
    if (!porHabito.has(c.item_id)) porHabito.set(c.item_id, new Set());
    porHabito.get(c.item_id)!.add(c.fecha);
  }

  const conRacha: RachaDeHabito[] = habitos.map((habito) => ({
    habito,
    racha: calcularRacha(porHabito.get(habito.item.id) ?? new Set(), habito.dias, hoyISO),
  }));

  const activas = conRacha
    .filter((r) => r.racha.actual > 0)
    .sort((a, b) => b.racha.actual - a.racha.actual);

  const mejorRecord = conRacha.reduce<RachaDeHabito | null>(
    (mejor, actual) =>
      actual.racha.record > 0 && (!mejor || actual.racha.record > mejor.racha.record)
        ? actual
        : mejor,
    null,
  );

  return {
    completadas: delRango.length,
    entrenos: delRango.filter((c) => c.tipo === 'entreno').length,
    rachas: activas,
    mejorRecord,
  };
}
