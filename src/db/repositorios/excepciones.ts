// Excepciones de series recurrentes: «solo esta» se materializa aquí
// (saltar una instancia o moverla a otra fecha), sin tocar la RRULE.

import type { ConexionDB } from '../tipos';

export type AccionExcepcion = 'saltar' | 'mover';

export interface Excepcion {
  item_id: string;
  fecha_original: string; // YYYY-MM-DD de la instancia según la serie
  accion: AccionExcepcion;
  nueva_fecha: string | null; // solo para 'mover'
}

export async function crearExcepcion(
  db: ConexionDB,
  itemId: string,
  fechaOriginal: string,
  accion: AccionExcepcion,
  nuevaFecha?: string,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO item_excepciones (item_id, fecha_original, accion, nueva_fecha)
     VALUES (?, ?, ?, ?);`,
    [itemId, fechaOriginal, accion, nuevaFecha ?? null],
  );
}

export async function listarExcepciones(db: ConexionDB): Promise<Excepcion[]> {
  return db.getAllAsync<Excepcion>('SELECT * FROM item_excepciones;', []);
}
