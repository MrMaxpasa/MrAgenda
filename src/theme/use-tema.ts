// Tema de la app (decisión de producto): sigue al sistema por defecto,
// con ajuste manual Automático / Claro / Oscuro persistido en `ajustes`.

import { useColorScheme } from 'react-native';
import { create } from 'zustand';

import { guardarAjuste, obtenerAjuste } from '@/db/repositorios/ajustes';
import type { ConexionDB } from '@/db/tipos';

import { colores, type Colores } from './tokens';

export type PreferenciaTema = 'auto' | 'claro' | 'oscuro';

export const CLAVE_TEMA = 'tema';

interface EstadoTema {
  preferencia: PreferenciaTema;
  fijarLocal: (preferencia: PreferenciaTema) => void;
}

export const useTiendaTema = create<EstadoTema>((set) => ({
  preferencia: 'auto',
  fijarLocal: (preferencia) => set({ preferencia }),
}));

/** Carga la preferencia guardada (llamar una vez al arrancar). */
export async function cargarPreferenciaTema(db: ConexionDB): Promise<void> {
  const guardada = await obtenerAjuste(db, CLAVE_TEMA);
  if (guardada === 'claro' || guardada === 'oscuro' || guardada === 'auto') {
    useTiendaTema.getState().fijarLocal(guardada);
  }
}

/** Cambia la preferencia y la persiste. */
export async function fijarPreferenciaTema(
  db: ConexionDB,
  preferencia: PreferenciaTema,
): Promise<void> {
  useTiendaTema.getState().fijarLocal(preferencia);
  await guardarAjuste(db, CLAVE_TEMA, preferencia);
}

export function useEsOscuro(): boolean {
  const sistema = useColorScheme();
  const preferencia = useTiendaTema((estado) => estado.preferencia);
  const esquema = preferencia === 'auto' ? (sistema ?? 'claro') : preferencia;
  return esquema === 'oscuro';
}

export function usePaleta(): Colores {
  return useEsOscuro() ? colores.oscuro : colores.claro;
}
