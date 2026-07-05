import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { listarHabitos } from '@/db/repositorios/habitos';
import { listarCompletados } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';

import { construirHabitosDeHoy, type HabitoDelDia } from './del-dia';

export { construirHabitosDeHoy } from './del-dia';
export type { HabitoDelDia } from './del-dia';

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
