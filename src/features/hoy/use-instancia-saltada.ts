// Flujo «te saltaste una instancia» (docs/02 §3), sin drama: si ayer quedó
// una instancia recurrente sin completar ni excepcionar, se ofrece moverla
// a hoy o dejarla pasar. Solo una tarjeta, la primera encontrada.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { listarInstanciasPorFecha } from '@/features/items/consultas';
import type { Instancia } from '@/features/items/instancias';
import { aFechaISO, sumarDias } from '@/lib/fechas';

import { useTiendaHoy } from './tienda';

export function useInstanciaSaltada(activo: boolean, hoyISO: string): Instancia | null {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [saltada, setSaltada] = useState<Instancia | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    const ayer = aFechaISO(sumarDias(new Date(`${hoyISO}T00:00`), -1));
    listarInstanciasPorFecha(db, ayer).then((instancias) => {
      if (!vivo) return;
      setSaltada(instancias.find((i) => i.item.rrule !== null && !i.hecha) ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [db, activo, hoyISO, version]);

  return saltada;
}
