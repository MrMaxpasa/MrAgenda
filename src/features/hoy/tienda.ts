// Estado mínimo de la vista Hoy: un contador de versión que los hooks
// observan. Cualquier escritura en la BD lo incrementa y las páginas
// visibles se refrescan.

import { create } from 'zustand';

interface EstadoHoy {
  version: number;
  refrescar: () => void;
}

export const useTiendaHoy = create<EstadoHoy>((set) => ({
  version: 0,
  refrescar: () => set((estado) => ({ version: estado.version + 1 })),
}));
