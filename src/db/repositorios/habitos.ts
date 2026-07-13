// Repositorio de hábitos: item tipo 'habito' + su configuración
// (icono y días activos) en habitos_config.

import type { DiasHabito } from '@/features/habitos/rachas';

import { filaAItem, type ConexionDB, type FilaItem, type Item } from '../tipos';

export interface Habito {
  item: Item;
  icono: string;
  dias: DiasHabito;
}

function serializarDias(dias: DiasHabito): string {
  return dias === 'diario' ? 'diario' : dias.join(',');
}

function deserializarDias(crudo: string): DiasHabito {
  if (crudo === 'diario') return 'diario';
  return crudo
    .split(',')
    .map(Number)
    .filter((d) => d >= 0 && d <= 6);
}

const SQL_NUEVO_ID = 'lower(hex(randomblob(16)))';

export async function crearHabito(
  db: ConexionDB,
  datos: { titulo: string; icono: string; dias: DiasHabito },
): Promise<void> {
  const ahora = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const fila = await tx.getFirstAsync<{ id: string }>(
      `INSERT INTO items (id, tipo, titulo, todo_el_dia, nivel_aviso, estado, creado_en, actualizado_en)
       VALUES (${SQL_NUEVO_ID}, 'habito', ?, 1, 0, 'pendiente', ?, ?)
       RETURNING id;`,
      [datos.titulo, ahora, ahora],
    );
    await tx.runAsync(
      `INSERT INTO habitos_config (item_id, icono, dias, comodines_usados_semana)
       VALUES (?, ?, ?, 0);`,
      [fila!.id, datos.icono, serializarDias(datos.dias)],
    );
  });
}

export async function actualizarHabito(
  db: ConexionDB,
  itemId: string,
  datos: { titulo: string; icono: string; dias: DiasHabito },
): Promise<void> {
  const ahora = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`UPDATE items SET titulo = ?, actualizado_en = ? WHERE id = ?;`, [
      datos.titulo,
      ahora,
      itemId,
    ]);
    await tx.runAsync(`UPDATE habitos_config SET icono = ?, dias = ? WHERE item_id = ?;`, [
      datos.icono,
      serializarDias(datos.dias),
      itemId,
    ]);
  });
}

export async function listarHabitos(db: ConexionDB): Promise<Habito[]> {
  const filas = await db.getAllAsync<FilaItem & { icono: string; dias: string }>(
    `SELECT items.*, habitos_config.icono, habitos_config.dias
     FROM items JOIN habitos_config ON habitos_config.item_id = items.id
     WHERE items.estado != 'archivado'
     ORDER BY items.creado_en ASC;`,
    [],
  );
  return filas.map(({ icono, dias, ...filaItem }) => ({
    item: filaAItem(filaItem),
    icono,
    dias: deserializarDias(dias),
  }));
}
