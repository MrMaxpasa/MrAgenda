// Apertura y migración de la base de datos.
// Se usa como onInit del SQLiteProvider en el layout raíz: la app no
// renderiza nada hasta que el esquema está al día.

import { MIGRACIONES } from './schema';
import type { ConexionDB } from './tipos';

export const NOMBRE_BD = 'diaria.db';

export async function migrarBaseDeDatos(db: ConexionDB): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;', []);
  const versionActual = fila?.user_version ?? 0;

  for (const migracion of MIGRACIONES) {
    if (migracion.version <= versionActual) continue;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migracion.sql);
      await tx.execAsync(`PRAGMA user_version = ${migracion.version};`);
    });
  }
}
