import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { listarPorFecha } from '@/db/repositorios/items';
import type { Item } from '@/db/tipos';

import { useTiendaHoy } from './tienda';

/** Items del día (YYYY-MM-DD), refrescados con cada escritura en la BD. */
export function useItemsDelDia(fecha: string): Item[] {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [lista, setLista] = useState<Item[]>([]);

  useEffect(() => {
    let activo = true;
    listarPorFecha(db, fecha).then((items) => {
      if (activo) setLista(items);
    });
    return () => {
      activo = false;
    };
  }, [db, fecha, version]);

  return lista;
}
