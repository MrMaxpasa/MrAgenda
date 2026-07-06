// Perfil del usuario (nombre) y estado del onboarding, sobre la tabla
// `ajustes`. Tienda zustand para que la cabecera de Hoy reaccione al
// terminar el onboarding sin recargar la app.

import { create } from 'zustand';

import { guardarAjuste, obtenerAjuste } from '@/db/repositorios/ajustes';
import type { ConexionDB } from '@/db/tipos';

export const CLAVE_NOMBRE = 'nombre';
export const CLAVE_ONBOARDING = 'onboarding-hecho';

interface EstadoPerfil {
  nombre: string | null;
  onboardingHecho: boolean;
  cargado: boolean;
  fijarLocal: (datos: Partial<EstadoPerfil>) => void;
}

export const useTiendaPerfil = create<EstadoPerfil>((set) => ({
  nombre: null,
  onboardingHecho: false,
  cargado: false,
  fijarLocal: (datos) => set(datos),
}));

/** Decide si mostrar el onboarding a partir del ajuste guardado. */
export function debeMostrarOnboarding(valorAjuste: string | null): boolean {
  return valorAjuste !== '1';
}

/** Lee perfil y estado del onboarding al arrancar. */
export async function cargarPerfil(db: ConexionDB): Promise<void> {
  const [nombre, onboarding] = await Promise.all([
    obtenerAjuste(db, CLAVE_NOMBRE),
    obtenerAjuste(db, CLAVE_ONBOARDING),
  ]);
  useTiendaPerfil.getState().fijarLocal({
    nombre: nombre && nombre.trim() ? nombre : null,
    onboardingHecho: !debeMostrarOnboarding(onboarding),
    cargado: true,
  });
}

export async function guardarNombre(db: ConexionDB, nombre: string): Promise<void> {
  const limpio = nombre.trim();
  await guardarAjuste(db, CLAVE_NOMBRE, limpio);
  useTiendaPerfil.getState().fijarLocal({ nombre: limpio || null });
}

export async function completarOnboarding(db: ConexionDB): Promise<void> {
  await guardarAjuste(db, CLAVE_ONBOARDING, '1');
  useTiendaPerfil.getState().fijarLocal({ onboardingHecho: true });
}
