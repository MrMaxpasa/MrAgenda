// Hábitos del día (pura, sin dependencias de Expo): estado de hoy y racha
// calculada. La usan la fila de Hoy, el briefing y la revisión semanal.

import type { Habito } from '@/db/repositorios/habitos';

import { calcularRacha, type Racha } from './rachas';

export interface HabitoDelDia {
  habito: Habito;
  hechaHoy: boolean;
  racha: Racha;
}

export function construirHabitosDeHoy(
  habitos: Habito[],
  completados: { item_id: string; fecha: string }[],
  hoyISO: string,
): HabitoDelDia[] {
  const diaSemana = new Date(`${hoyISO}T00:00`).getDay();

  const porHabito = new Map<string, Set<string>>();
  for (const c of completados) {
    if (!porHabito.has(c.item_id)) porHabito.set(c.item_id, new Set());
    porHabito.get(c.item_id)!.add(c.fecha);
  }

  return habitos
    .filter((h) => h.dias === 'diario' || h.dias.includes(diaSemana))
    .map((habito) => {
      const hechas = porHabito.get(habito.item.id) ?? new Set<string>();
      return {
        habito,
        hechaHoy: hechas.has(hoyISO),
        racha: calcularRacha(hechas, habito.dias, hoyISO),
      };
    });
}
