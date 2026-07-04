// Repositorio de items: única puerta de acceso a la tabla `items`.
// Recibe la conexión (useSQLiteContext() en la app, node:sqlite en tests).

import { aFechaISO, sumarDias } from '@/lib/fechas';
import { conCount, contarInstanciasHasta, parsearFin, totalInstancias } from '@/lib/recurrencia';

import {
  filaAItem,
  type ConexionDB,
  type FilaItem,
  type Item,
  type NuevoItem,
} from '../tipos';

// id aleatorio de 32 hex generado por SQLite: evita depender de un
// polyfill de crypto en React Native.
const SQL_NUEVO_ID = 'lower(hex(randomblob(16)))';

export async function crear(db: ConexionDB, datos: NuevoItem): Promise<Item> {
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

export async function obtenerPorId(db: ConexionDB, id: string): Promise<Item | null> {
  const fila = await db.getFirstAsync<FilaItem>('SELECT * FROM items WHERE id = ?;', [id]);
  return fila ? filaAItem(fila) : null;
}

/**
 * Items NO recurrentes y no archivados cuyo inicio cae en el día indicado
 * (YYYY-MM-DD): primero los que tienen hora, en orden; al final los de día
 * completo. Los recurrentes se expanden aparte (features/items).
 */
export async function listarPorFecha(db: ConexionDB, fecha: string): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado != 'archivado'
       AND rrule IS NULL
       AND fecha_inicio IS NOT NULL
       AND date(fecha_inicio) = date(?)
     ORDER BY todo_el_dia ASC, fecha_inicio ASC, creado_en ASC;`,
    [fecha],
  );
  return filas.map(filaAItem);
}

/** Series recurrentes activas (se expanden por ventana fuera de SQL). */
export async function listarRecurrentes(db: ConexionDB): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items WHERE estado != 'archivado' AND rrule IS NOT NULL;`,
    [],
  );
  return filas.map(filaAItem);
}

/** Log completo de instancias completadas (item_id + fecha original). */
export async function listarCompletados(
  db: ConexionDB,
): Promise<{ item_id: string; fecha: string }[]> {
  return db.getAllAsync<{ item_id: string; fecha: string }>(
    'SELECT item_id, fecha FROM completados;',
    [],
  );
}

/** Completados de un rango de fechas con el tipo del ítem (pestaña Tú). */
export async function completadosEntre(
  db: ConexionDB,
  desde: string,
  hasta: string,
): Promise<{ item_id: string; fecha: string; tipo: string }[]> {
  return db.getAllAsync<{ item_id: string; fecha: string; tipo: string }>(
    `SELECT c.item_id, c.fecha, i.tipo
     FROM completados c JOIN items i ON i.id = c.item_id
     WHERE c.fecha BETWEEN ? AND ?;`,
    [desde, hasta],
  );
}

export async function actualizar(
  db: ConexionDB,
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

export async function archivar(db: ConexionDB, id: string): Promise<void> {
  await db.runAsync(`UPDATE items SET estado = 'archivado', actualizado_en = ? WHERE id = ?;`, [
    new Date().toISOString(),
    id,
  ]);
}

/**
 * Marca el ítem como hecho y lo registra en `completados` (el log por
 * instancia que alimentará las rachas). `fechaInstancia` es YYYY-MM-DD.
 */
export async function completar(db: ConexionDB, id: string, fechaInstancia: string): Promise<void> {
  const ahora = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    // en series recurrentes y hábitos el estado vive por instancia/día
    // (en completados); el item solo cambia de estado si es puntual
    await tx.runAsync(
      `UPDATE items
       SET estado = CASE WHEN rrule IS NULL AND tipo != 'habito' THEN 'hecho' ELSE estado END,
           actualizado_en = ?
       WHERE id = ?;`,
      [ahora, id],
    );
    await tx.runAsync(
      `INSERT INTO completados (id, item_id, fecha, hecho_en)
       VALUES (${SQL_NUEVO_ID}, ?, ?, ?);`,
      [id, fechaInstancia, ahora],
    );
  });
}

/** Deshace un completado: vuelve a pendiente y borra el registro del log. */
export async function reabrir(db: ConexionDB, id: string, fechaInstancia: string): Promise<void> {
  const ahora = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`UPDATE items SET estado = 'pendiente', actualizado_en = ? WHERE id = ?;`, [
      ahora,
      id,
    ]);
    await tx.runAsync(`DELETE FROM completados WHERE item_id = ? AND fecha = ?;`, [
      id,
      fechaInstancia,
    ]);
  });
}

/**
 * «Todas las futuras»: divide una serie recurrente en la fecha dada.
 * La serie vieja se trunca (COUNT hasta el día anterior) y se crea una
 * nueva desde `desdeFecha` con los cambios aplicados. Si la división cae
 * en la primera instancia, se edita la serie en el sitio.
 * Devuelve la serie que rige a partir de `desdeFecha`.
 */
export async function dividirSerie(
  db: ConexionDB,
  id: string,
  desdeFecha: string,
  cambios: Partial<NuevoItem>,
): Promise<Item | null> {
  const item = await obtenerPorId(db, id);
  if (!item?.rrule || !item.fecha_inicio) return null;

  const horaVieja = item.fecha_inicio.length > 10 ? item.fecha_inicio.slice(10) : '';
  const nuevaFechaInicio = cambios.fecha_inicio ?? `${desdeFecha}${horaVieja}`;

  const diaAnterior = aFechaISO(sumarDias(new Date(`${desdeFecha}T00:00`), -1));
  const instanciasAntes = contarInstanciasHasta(item.rrule, item.fecha_inicio, diaAnterior);

  if (instanciasAntes === 0) {
    return actualizar(db, id, { ...cambios, fecha_inicio: nuevaFechaInicio });
  }

  await actualizar(db, id, {
    rrule: conCount(item.rrule, instanciasAntes),
    rrule_fin: JSON.stringify({ tipo: 'until', fecha: diaAnterior }),
  });

  const totalPrevio = totalInstancias(item.rrule);
  const finPrevio = parsearFin(item.rrule_fin);
  let rruleNueva = item.rrule;
  let finNuevo = item.rrule_fin;
  if (totalPrevio) {
    const restantes = totalPrevio - instanciasAntes;
    rruleNueva = conCount(item.rrule, restantes);
    if (finPrevio?.tipo === 'count') {
      finNuevo = JSON.stringify({ tipo: 'count', n: restantes });
    }
  }

  return crear(db, {
    tipo: item.tipo,
    titulo: item.titulo,
    cuerpo: item.cuerpo,
    fecha_fin: item.fecha_fin,
    todo_el_dia: item.todo_el_dia,
    nivel_aviso: item.nivel_aviso,
    aviso_offset_min: item.aviso_offset_min,
    ...cambios,
    fecha_inicio: nuevaFechaInicio,
    rrule: cambios.rrule ?? rruleNueva,
    rrule_fin: cambios.rrule_fin ?? finNuevo,
  });
}

/**
 * Mueve el ítem a otra fecha (YYYY-MM-DD) conservando su hora si la tenía.
 * Un ítem sin fecha pasa a ser de día completo en la nueva fecha.
 */
export async function posponer(db: ConexionDB, id: string, nuevaFecha: string): Promise<void> {
  await db.runAsync(
    `UPDATE items SET
       todo_el_dia = CASE WHEN fecha_inicio IS NULL THEN 1 ELSE todo_el_dia END,
       fecha_inicio = ? || COALESCE(substr(fecha_inicio, 11), ''),
       actualizado_en = ?
     WHERE id = ?;`,
    [nuevaFecha, new Date().toISOString(), id],
  );
}
