// Repositorio de items: única puerta de acceso a la tabla `items`.
// Funciones que reciben la conexión (desde useSQLiteContext() o tests).
// La Fase 1 lo ampliará (recurrencias, posponer, completar instancias…).

import type { SQLiteDatabase } from 'expo-sqlite';

import { filaAItem, type FilaItem, type Item, type NuevoItem } from '../tipos';

// id aleatorio de 32 hex generado por SQLite: evita depender de un
// polyfill de crypto en React Native.
const SQL_NUEVO_ID = 'lower(hex(randomblob(16)))';

export async function crear(db: SQLiteDatabase, datos: NuevoItem): Promise<Item> {
  const ahora = new Date().toISOString();
  const fila = await db.getFirstAsync<FilaItem>(
    `INSERT INTO items (
       id, tipo, titulo, cuerpo, fecha_inicio, fecha_fin, todo_el_dia,
       rrule, rrule_fin, nivel_aviso, aviso_offset_min, estado, creado_en, actualizado_en
     ) VALUES (${SQL_NUEVO_ID}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
     RETURNING *;`,
    [
      datos.tipo,
      datos.titulo,
      datos.cuerpo ?? null,
      datos.fecha_inicio ?? null,
      datos.fecha_fin ?? null,
      datos.todo_el_dia ? 1 : 0,
      datos.rrule ?? null,
      datos.rrule_fin ?? null,
      datos.nivel_aviso ?? 1,
      datos.aviso_offset_min ?? null,
      ahora,
      ahora,
    ],
  );
  if (!fila) throw new Error('No se pudo crear el ítem');
  return filaAItem(fila);
}

export async function obtenerPorId(db: SQLiteDatabase, id: string): Promise<Item | null> {
  const fila = await db.getFirstAsync<FilaItem>('SELECT * FROM items WHERE id = ?;', [id]);
  return fila ? filaAItem(fila) : null;
}

/**
 * Items no archivados cuyo inicio cae dentro del día indicado (YYYY-MM-DD),
 * ordenados por hora. Los recurrentes expandidos por ventana llegan en Fase 2.
 */
export async function listarPorFecha(db: SQLiteDatabase, fecha: string): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado != 'archivado'
       AND fecha_inicio IS NOT NULL
       AND date(fecha_inicio) = date(?)
     ORDER BY todo_el_dia DESC, fecha_inicio ASC;`,
    [fecha],
  );
  return filas.map(filaAItem);
}

export async function actualizar(
  db: SQLiteDatabase,
  id: string,
  cambios: Partial<NuevoItem> & { estado?: Item['estado'] },
): Promise<Item | null> {
  const entradas = Object.entries(cambios).filter(([, valor]) => valor !== undefined);
  if (entradas.length === 0) return obtenerPorId(db, id);

  const columnas = entradas.map(([clave]) => `${clave} = ?`).join(', ');
  const valores = entradas.map(([clave, valor]) => {
    if (clave === 'todo_el_dia') return valor ? 1 : 0;
    return valor as string | number | null;
  });

  const fila = await db.getFirstAsync<FilaItem>(
    `UPDATE items SET ${columnas}, actualizado_en = ? WHERE id = ? RETURNING *;`,
    [...valores, new Date().toISOString(), id],
  );
  return fila ? filaAItem(fila) : null;
}

export async function archivar(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE items SET estado = 'archivado', actualizado_en = ? WHERE id = ?;`,
    [new Date().toISOString(), id],
  );
}
