import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { listarInstanciasPorFecha } from '@/features/items/consultas';
import type { Instancia } from '@/features/items/instancias';

import { useTiendaHoy } from './tienda';

/** Instancias del día (simples + recurrentes), refrescadas con cada escritura. */
export function useInstanciasDelDia(fecha: string): Instancia[] {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [lista, setLista] = useState<Instancia[]>([]);

  useEffect(() => {
    let activo = true;
    listarInstanciasPorFecha(db, fecha).then((instancias) => {
      if (activo) setLista(instancias);
    });
    return () => {
      activo = false;
    };
  }, [db, fecha, version]);

  return lista;
}
