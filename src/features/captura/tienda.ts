// Estado de la hoja de captura: el FAB la abre desde cualquier pestaña.

import { create } from 'zustand';

interface EstadoCaptura {
  abierta: boolean;
  abrir: () => void;
  cerrar: () => void;
}

export const useTiendaCaptura = create<EstadoCaptura>((set) => ({
  abierta: false,
  abrir: () => set({ abierta: true }),
  cerrar: () => set({ abierta: false }),
}));
