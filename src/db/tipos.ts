// Tipos del modelo de datos — espejo del esquema SQLite (docs/04-arquitectura.md).

export type ValorSQL = string | number | null;

/**
 * Subconjunto de la API de expo-sqlite que usan motor de migraciones y
 * repositorios. `SQLiteDatabase` la satisface estructuralmente; en tests se
 * implementa sobre better-sqlite3 (SQLite real en memoria, solo dev).
 */
export interface ConexionDB {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: ValorSQL[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params: ValorSQL[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: ValorSQL[]): Promise<T[]>;
  withExclusiveTransactionAsync(tarea: (tx: ConexionDB) => Promise<void>): Promise<void>;
}

export type TipoItem =
  | 'evento'
  | 'tarea'
  | 'nota'
  | 'habito'
  | 'entreno'
  | 'lista'
  | 'referencia';

export type EstadoItem = 'pendiente' | 'hecho' | 'archivado';

// 0 silencioso (solo aparece en Hoy) | 1 notificación normal | 2 alarma insistente
export type NivelAviso = 0 | 1 | 2;

export interface Item {
  id: string;
  tipo: TipoItem;
  titulo: string;
  cuerpo: string | null;
  fecha_inicio: string | null; // ISO; null en notas sin fecha
  fecha_fin: string | null;
  todo_el_dia: boolean;
  rrule: string | null;
  rrule_fin: string | null; // 'until' o 'count' serializado para mostrar «5 de 8»
  nivel_aviso: NivelAviso;
  aviso_offset_min: number | null;
  estado: EstadoItem;
  creado_en: string;
  actualizado_en: string;
}

// Campos que decide quien crea el ítem; el resto los pone el repositorio.
export interface NuevoItem {
  tipo: TipoItem;
  titulo: string;
  cuerpo?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  todo_el_dia?: boolean;
  rrule?: string | null;
  rrule_fin?: string | null;
  nivel_aviso?: NivelAviso;
  aviso_offset_min?: number | null;
}

// Fila cruda de SQLite (booleanos como INTEGER).
export interface FilaItem extends Omit<Item, 'todo_el_dia'> {
  todo_el_dia: number;
}

export function filaAItem(fila: FilaItem): Item {
  return { ...fila, todo_el_dia: fila.todo_el_dia === 1 };
}
