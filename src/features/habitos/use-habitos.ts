import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { listarHabitos, type Habito } from '@/db/repositorios/habitos';
import { listarCompletados } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';

import { calcularRacha, type Racha } from './rachas';

export interface HabitoDelDia {
  habito: Habito;
  hechaHoy: boolean;
  racha: Racha;
}

/** Hábitos activos hoy con estado y racha — pura, reutilizada por el briefing. */
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

/** Hábitos activos hoy con su estado del día y su racha calculada. */
export function useHabitosDeHoy(hoyISO: string): HabitoDelDia[] {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [lista, setLista] = useState<HabitoDelDia[]>([]);

  useEffect(() => {
    let activo = true;
    Promise.all([listarHabitos(db), listarCompletados(db)])
      .then(([habitos, completados]) => {
        if (!activo) return;
        setLista(construirHabitosDeHoy(habitos, completados, hoyISO));
      })
      .catch((error) => {
        console.error('[habitos] error cargando la fila de hábitos:', error);
      });
    return () => {
      activo = false;
    };
  }, [db, hoyISO, version]);

  return lista;
}
