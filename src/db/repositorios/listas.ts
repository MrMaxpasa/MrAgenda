// Listas vivas (docs/02 §4): contenedora = item tipo 'lista' sin enlace
// saliente 'en-lista'; elemento = item tipo 'lista' enlazado a ella.
// Los elementos se marcan con items.estado ('hecho').

import { filaAItem, type ConexionDB, type FilaItem, type Item } from '../tipos';
import { crearEnlace } from './enlaces';
import { crear } from './items';

export interface ListaResumen {
  item: Item;
  total: number;
  pendientes: number;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Busca la contenedora por nombre (sin distinguir mayúsculas) o la crea. */
export async function asegurarLista(db: ConexionDB, nombre: string): Promise<Item> {
  const existente = await db.getFirstAsync<FilaItem>(
    `SELECT * FROM items
     WHERE tipo = 'lista'
       AND estado != 'archivado'
       AND lower(titulo) = lower(?)
       AND id NOT IN (SELECT origen_id FROM enlaces WHERE tipo = 'en-lista');`,
    [nombre],
  );
  if (existente) return filaAItem(existente);
  return crear(db, { tipo: 'lista', titulo: capitalizar(nombre), todo_el_dia: true });
}

/** Crea un elemento dentro de la lista (por id de contenedora). */
export async function anadirElemento(
  db: ConexionDB,
  listaId: string,
  titulo: string,
): Promise<Item> {
  const elemento = await crear(db, { tipo: 'lista', titulo: capitalizar(titulo), todo_el_dia: true });
  await crearEnlace(db, elemento.id, listaId, 'en-lista');
  return elemento;
}

/** Contenedoras activas con sus contadores («3/7»). */
export async function listarListas(db: ConexionDB): Promise<ListaResumen[]> {
  const filas = await db.getAllAsync<FilaItem & { total: number; pendientes: number }>(
    `SELECT c.*,
            COUNT(el.id) AS total,
            COALESCE(SUM(CASE WHEN el.estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes
     FROM items c
     LEFT JOIN enlaces e ON e.destino_id = c.id AND e.tipo = 'en-lista'
     LEFT JOIN items el ON el.id = e.origen_id AND el.estado != 'archivado'
     WHERE c.tipo = 'lista'
       AND c.estado != 'archivado'
       AND c.id NOT IN (SELECT origen_id FROM enlaces WHERE tipo = 'en-lista')
     GROUP BY c.id
     ORDER BY c.titulo COLLATE NOCASE ASC;`,
    [],
  );
  return filas.map(({ total, pendientes, ...fila }) => ({
    item: filaAItem(fila),
    total,
    pendientes,
  }));
}

/** Elementos de una lista, pendientes primero y luego por antigüedad. */
export async function elementosDeLista(db: ConexionDB, listaId: string): Promise<Item[]> {
  const filas = await db.getAllAsync<FilaItem>(
    `SELECT el.*
     FROM enlaces e
     JOIN items el ON el.id = e.origen_id
     WHERE e.destino_id = ? AND e.tipo = 'en-lista' AND el.estado != 'archivado'
     ORDER BY CASE el.estado WHEN 'pendiente' THEN 0 ELSE 1 END, el.creado_en ASC;`,
    [listaId],
  );
  return filas.map(filaAItem);
}
