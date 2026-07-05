// Ajustes clave-valor (tabla `ajustes`): caché diaria del briefing,
// preferencias… Valores siempre string; el que guarda serializa.

import type { ConexionDB } from '../tipos';

export async function obtenerAjuste(db: ConexionDB, clave: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string | null }>(
    'SELECT valor FROM ajustes WHERE clave = ?;',
    [clave],
  );
  return fila?.valor ?? null;
}

export async function guardarAjuste(db: ConexionDB, clave: string, valor: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (?, ?);', [clave, valor]);
}
