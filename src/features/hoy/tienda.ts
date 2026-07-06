// Estado mínimo de la vista Hoy: contadores de versión que los hooks
// observan. `version` refresca la UI; `versionAvisos` dispara además la
// reprogramación de notificaciones (cara), y solo se incrementa cuando el
// cambio puede afectar a los avisos.

import { create } from 'zustand';

interface EstadoHoy {
  version: number;
  versionAvisos: number;
  // escritura que puede afectar a avisos (por defecto, seguro): refresca UI
  // y reprograma notificaciones.
  refrescar: () => void;
  // escritura que NO afecta a avisos (p. ej. togglear un hábito, nivel 0):
  // refresca la UI sin reprogramar.
  refrescarSoloUI: () => void;
}

export const useTiendaHoy = create<EstadoHoy>((set) => ({
  version: 0,
  versionAvisos: 0,
  refrescar: () =>
    set((estado) => ({ version: estado.version + 1, versionAvisos: estado.versionAvisos + 1 })),
  refrescarSoloUI: () => set((estado) => ({ version: estado.version + 1 })),
}));
