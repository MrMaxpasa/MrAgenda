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

/**
 * Excepciones que afectan a un día concreto: las que saltan una instancia
 * natural (fecha_original = día) o mueven una hacia él (nueva_fecha = día).
 * Es exactamente lo que consume instanciasEnDia para ese día.
 */
export async function excepcionesDeFecha(db: ConexionDB, fecha: string): Promise<Excepcion[]> {
  return db.getAllAsync<Excepcion>(
    'SELECT * FROM item_excepciones WHERE fecha_original = ? OR nueva_fecha = ?;',
    [fecha, fecha],
  );
}

/**
 * Las mismas excepciones, pero de una ventana de días (ambos extremos
 * incluidos): permite expandir varios días con una sola consulta.
 */
export async function excepcionesEntre(
  db: ConexionDB,
  desde: string,
  hasta: string,
): Promise<Excepcion[]> {
  return db.getAllAsync<Excepcion>(
    `SELECT * FROM item_excepciones
     WHERE (fecha_original BETWEEN ? AND ?) OR (nueva_fecha BETWEEN ? AND ?);`,
    [desde, hasta, desde, hasta],
  );
}
