// Sesiones de deporte: registro por entreno (ejercicios, series, pesos)
// serializado en ejercicios_json (docs/04).

import type { ConexionDB } from '../tipos';

export interface Serie {
  reps: number;
  peso: number | null; // kg; null para ejercicios sin peso
}

export interface Ejercicio {
  nombre: string;
  series: Serie[];
}

export interface Sesion {
  id: string;
  item_id: string;
  fecha: string; // YYYY-MM-DD
  ejercicios: Ejercicio[];
}

interface FilaSesion {
  id: string;
  item_id: string;
  fecha: string;
  ejercicios_json: string;
}

const SQL_NUEVO_ID = 'lower(hex(randomblob(16)))';

function filaASesion(fila: FilaSesion): Sesion {
  let ejercicios: Ejercicio[] = [];
  try {
    ejercicios = JSON.parse(fila.ejercicios_json) as Ejercicio[];
  } catch {
    // una fila corrupta no debe tumbar la vista
  }
  return { id: fila.id, item_id: fila.item_id, fecha: fila.fecha, ejercicios };
}

export async function guardarSesion(
  db: ConexionDB,
  itemId: string,
  fecha: string,
  ejercicios: Ejercicio[],
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sesiones_deporte (id, item_id, fecha, ejercicios_json)
     VALUES (${SQL_NUEVO_ID}, ?, ?, ?);`,
    [itemId, fecha, JSON.stringify(ejercicios)],
  );
}

/** Última sesión registrada de cada entreno (para la «última marca»). */
export async function ultimasSesiones(db: ConexionDB): Promise<Map<string, Sesion>> {
  const filas = await db.getAllAsync<FilaSesion>(
    'SELECT * FROM sesiones_deporte ORDER BY fecha ASC;',
    [],
  );
  const mapa = new Map<string, Sesion>();
  for (const fila of filas) {
    mapa.set(fila.item_id, filaASesion(fila)); // la última fecha gana
  }
  return mapa;
}

/** Última sesión de cada entreno dado (acotado por item_id para la vista Hoy). */
export async function ultimasSesionesDe(
  db: ConexionDB,
  itemIds: string[],
): Promise<Map<string, Sesion>> {
  if (itemIds.length === 0) return new Map();
  const huecos = itemIds.map(() => '?').join(',');
  const filas = await db.getAllAsync<FilaSesion>(
    `SELECT * FROM sesiones_deporte WHERE item_id IN (${huecos}) ORDER BY fecha ASC;`,
    itemIds,
  );
  const mapa = new Map<string, Sesion>();
  for (const fila of filas) {
    mapa.set(fila.item_id, filaASesion(fila)); // la última fecha gana
  }
  return mapa;
}

/** Historial de sesiones de un entreno (alimentará las gráficas de Fase 5). */
export async function sesionesDeItem(db: ConexionDB, itemId: string): Promise<Sesion[]> {
  const filas = await db.getAllAsync<FilaSesion>(
    'SELECT * FROM sesiones_deporte WHERE item_id = ? ORDER BY fecha ASC;',
    [itemId],
  );
  return filas.map(filaASesion);
}
