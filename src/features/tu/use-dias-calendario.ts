// Instancias de cada día visible del calendario, en un mapa fecha→instancias.
// Reutiliza listarInstanciasPorFecha (consulta acotada de la Tanda 2), sin
// duplicar la expansión de recurrencias. El panel del día lee del mismo mapa.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { useTiendaHoy } from '@/features/hoy/tienda';
import { listarInstanciasPorFecha } from '@/features/items/consultas';
import type { Instancia } from '@/features/items/instancias';

export type MapaDias = Map<string, Instancia[]>;

export function useDiasCalendario(fechas: string[]): MapaDias {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [mapa, setMapa] = useState<MapaDias>(new Map());

  // clave estable de la ventana visible para no recargar de más
  const clave = fechas.length > 0 ? `${fechas[0]}|${fechas[fechas.length - 1]}` : '';

  useEffect(() => {
    let vivo = true;
    Promise.all(fechas.map((f) => listarInstanciasPorFecha(db, f)))
      .then((listas) => {
        if (!vivo) return;
        const nuevo: MapaDias = new Map();
        fechas.forEach((f, i) => nuevo.set(f, listas[i]!));
        setMapa(nuevo);
      })
      .catch((error) => console.error('[tu] error cargando el calendario:', error));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, clave, version]);

  return mapa;
}
