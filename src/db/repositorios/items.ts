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

/**
 * Completados dirigidos: solo los de estos ítems y estas fechas (consulta
 * acotada para la vista Hoy, en vez de cargar todo el log). Puede devolver
 * algún par de más; quien la usa consulta pares exactos, así que es inocuo.
 * Usa el índice idx_completados_item_fecha.
 */
export async function completadosDe(
  db: ConexionDB,
  itemIds: string[],
  fechas: string[],
): Promise<{ item_id: string; fecha: string }[]> {
  if (itemIds.length === 0 || fechas.length === 0) return [];
  const huecosItems = itemIds.map(() => '?').join(',');
  const huecosFechas = fechas.map(() => '?').join(',');
  return db.getAllAsync<{ item_id: string; fecha: string }>(
    `SELECT item_id, fecha FROM completados
     WHERE item_id IN (${huecosItems}) AND fecha IN (${huecosFechas});`,
    [...itemIds, ...fechas],
  );
}

/**
 * Pendientes arrastrados: tareas/eventos/entrenos puntuales con fecha
 * anterior al día dado que siguen sin completar (para el briefing).
 */
export async function listarPendientesAnteriores(db: ConexionDB, hoy: string): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado = 'pendiente'
       AND rrule IS NULL
       AND tipo IN ('tarea', 'evento', 'entreno')
       AND fecha_inicio IS NOT NULL
       AND date(fecha_inicio) < date(?)
     ORDER BY fecha_inicio ASC;`,
    [hoy],
  );
  return filas.map(filaAItem);
}

/**
 * Tareas «sueltas» para la pestaña Todo: pendientes puntuales sin fecha o
 * con fecha ya pasada. Nada capturado puede quedarse sin vista que lo muestre.
 * Primero las vencidas (la más antigua arriba), luego las que no tienen fecha.
 */
export async function listarTareasSueltas(db: ConexionDB, hoy: string): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado = 'pendiente'
       AND rrule IS NULL
       AND tipo IN ('tarea', 'evento', 'entreno')
       AND (fecha_inicio IS NULL OR date(fecha_inicio) < date(?))
     ORDER BY fecha_inicio IS NULL, fecha_inicio ASC, creado_en ASC
     LIMIT 100;`,
    [hoy],
  );
  return filas.map(filaAItem);
}

/**
 * Pendientes puntuales con fecha dentro de la ventana (ambos días incluidos),
 * para «Próximos 7 días». Las series recurrentes quedan fuera a propósito:
 * viven en la sección Rutinas, una sola vez (docs/02 §4).
 */
export async function listarPendientesEntre(
  db: ConexionDB,
  desde: string,
  hasta: string,
): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado = 'pendiente'
       AND rrule IS NULL
       AND tipo IN ('tarea', 'evento', 'entreno')
       AND fecha_inicio IS NOT NULL
       AND date(fecha_inicio) BETWEEN date(?) AND date(?)
     ORDER BY date(fecha_inicio) ASC, todo_el_dia ASC, fecha_inicio ASC, creado_en ASC;`,
    [desde, hasta],
  );
  return filas.map(filaAItem);
}

export interface ConteoCategorias {
  rutinas: number;
  tareas: number;
  listas: number;
  notas: number;
  referencia: number;
}

/** Contadores de los chips de la pestaña Todo, en una sola consulta. */
export async function contarPorCategoria(db: ConexionDB, hoy: string): Promise<ConteoCategorias> {
  const fila = await db.getFirstAsync<ConteoCategorias>(
    `SELECT
       (SELECT COUNT(*) FROM items
         WHERE estado != 'archivado' AND rrule IS NOT NULL) AS rutinas,
       (SELECT COUNT(*) FROM items
         WHERE estado = 'pendiente' AND rrule IS NULL
           AND tipo IN ('tarea', 'evento', 'entreno')
           AND (fecha_inicio IS NULL OR date(fecha_inicio) < date(?))) AS tareas,
       (SELECT COUNT(*) FROM items c
         WHERE c.tipo = 'lista' AND c.estado != 'archivado'
           AND c.id NOT IN (SELECT origen_id FROM enlaces WHERE tipo = 'en-lista')) AS listas,
       (SELECT COUNT(*) FROM items
         WHERE tipo = 'nota' AND estado != 'archivado') AS notas,
       (SELECT COUNT(*) FROM items
         WHERE tipo = 'referencia' AND estado != 'archivado') AS referencia;`,
    [hoy],
  );
  return fila ?? { rutinas: 0, tareas: 0, listas: 0, notas: 0, referencia: 0 };
}

/** Buscador global de la pestaña Todo (título y cuerpo, sin archivados). */
export async function buscar(db: ConexionDB, texto: string): Promise<Item[]> {
  const patron = `%${texto.toLowerCase()}%`;
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado != 'archivado'
       AND (lower(titulo) LIKE ? OR lower(COALESCE(cuerpo, '')) LIKE ?)
     ORDER BY actualizado_en DESC
     LIMIT 50;`,
    [patron, patron],
  );
  return filas.map(filaAItem);
}

/** Notas o referencias activas, las tocadas recientemente primero. */
export async function listarPorTipo(db: ConexionDB, tipo: 'nota' | 'referencia'): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE tipo = ? AND estado != 'archivado'
     ORDER BY actualizado_en DESC
     LIMIT 100;`,
    [tipo],
  );
  return filas.map(filaAItem);
}

/** Historial: lo hecho o archivado recientemente. */
export async function listarHistorial(db: ConexionDB): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT * FROM items
     WHERE estado IN ('hecho', 'archivado')
     ORDER BY actualizado_en DESC
     LIMIT 50;`,
    [],
  );
  return filas.map(filaAItem);
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
