// Tienda global del editor universal: un único punto de entrada para editar
// cualquier ítem desde cualquier vista (Hoy, Todo, panel de Tú). Igual patrón
// que el Toast: estado en Zustand + una capa montada una vez (CapaEditor).

import { create } from 'zustand';

import type { Item } from '@/db/tipos';
import { aFechaISO } from '@/lib/fechas';

export interface ObjetivoEditor {
  item: Item;
  fechaOriginal: string; // instancia tocada: clave de completados/excepciones
}

interface EstadoEditor {
  objetivo: ObjetivoEditor | null;
  abrir: (item: Item, fechaOriginal?: string) => void;
  cerrar: () => void;
}

export const useTiendaEditor = create<EstadoEditor>((set) => ({
  objetivo: null,
  abrir: (item, fechaOriginal) =>
    set({
      objetivo: {
        item,
        fechaOriginal: fechaOriginal ?? item.fecha_inicio?.slice(0, 10) ?? aFechaISO(new Date()),
      },
    }),
  cerrar: () => set({ objetivo: null }),
}));
