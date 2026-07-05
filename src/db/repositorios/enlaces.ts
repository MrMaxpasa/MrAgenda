// Enlaces entre ítems (tabla `enlaces`): el grafo que agrupa las listas
// hoy y sostendrá el mapa mental del futuro (docs/01).

import { filaAItem, type ConexionDB, type FilaItem, type Item } from '../tipos';

export async function crearEnlace(
  db: ConexionDB,
  origenId: string,
  destinoId: string,
  tipo: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO enlaces (origen_id, destino_id, tipo) VALUES (?, ?, ?);',
    [origenId, destinoId, tipo],
  );
}

export async function eliminarEnlace(
  db: ConexionDB,
  origenId: string,
  destinoId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM enlaces WHERE origen_id = ? AND destino_id = ?;', [
    origenId,
    destinoId,
  ]);
}

export interface Enlazado {
  item: Item;
  tipo: string | null;
}

/** Ítems enlazados con el dado, en cualquier dirección. */
export async function enlacesDe(db: ConexionDB, itemId: string): Promise<Enlazado[]> {
  const filas = await db.getAllAsync<FilaItem & { tipo_enlace: string | null }>(
    `SELECT i.*, e.tipo AS tipo_enlace
     FROM enlaces e
     JOIN items i ON i.id = CASE WHEN e.origen_id = ? THEN e.destino_id ELSE e.origen_id END
     WHERE (e.origen_id = ? OR e.destino_id = ?)
       AND i.estado != 'archivado';`,
    [itemId, itemId, itemId],
  );
  return filas.map(({ tipo_enlace, ...fila }) => ({ item: filaAItem(fila), tipo: tipo_enlace }));
}
