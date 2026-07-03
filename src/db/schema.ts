// Esquema SQLite — docs/04-arquitectura.md.
// Migraciones versionadas: cada entrada se aplica una sola vez, en orden,
// y la versión aplicada queda registrada en PRAGMA user_version.
// REGLA: nunca editar una migración ya publicada; añadir una nueva.

export interface Migracion {
  version: number;
  descripcion: string;
  sql: string;
}

export const MIGRACIONES: Migracion[] = [
  {
    version: 1,
    descripcion: 'Esquema inicial: items, excepciones, completados, enlaces, hábitos, deporte y ajustes',
    sql: `
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,               -- 'evento'|'tarea'|'nota'|'habito'|'entreno'|'lista'|'referencia'
        titulo TEXT NOT NULL,
        cuerpo TEXT,
        fecha_inicio TEXT,                -- ISO, nullable (notas sin fecha)
        fecha_fin TEXT,
        todo_el_dia INTEGER NOT NULL DEFAULT 0,
        rrule TEXT,                       -- regla de recurrencia, nullable
        rrule_fin TEXT,                   -- 'until' o 'count' serializado para mostrar "5 de 8"
        nivel_aviso INTEGER NOT NULL DEFAULT 1,  -- 0 silencioso | 1 notificación | 2 alarma insistente
        aviso_offset_min INTEGER,
        estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente'|'hecho'|'archivado'
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );
      -- La vista Hoy consulta por fecha y estado: debe abrir en <1 s.
      CREATE INDEX idx_items_fecha_inicio ON items(fecha_inicio);
      CREATE INDEX idx_items_estado_fecha ON items(estado, fecha_inicio);

      -- "solo esta" en recurrentes
      CREATE TABLE item_excepciones (
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        fecha_original TEXT NOT NULL,
        accion TEXT NOT NULL,             -- 'saltar'|'mover'
        nueva_fecha TEXT,
        PRIMARY KEY (item_id, fecha_original)
      );

      -- log por instancia (alimenta las rachas)
      CREATE TABLE completados (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        fecha TEXT NOT NULL,              -- fecha de la instancia completada
        hecho_en TEXT NOT NULL
      );
      CREATE INDEX idx_completados_item_fecha ON completados(item_id, fecha);

      -- grafo: nota↔evento, tarea↔proyecto → futuro mapa mental
      CREATE TABLE enlaces (
        origen_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        destino_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        tipo TEXT,
        PRIMARY KEY (origen_id, destino_id)
      );

      CREATE TABLE habitos_config (
        item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
        icono TEXT NOT NULL,
        dias TEXT NOT NULL,               -- 'diario' o días concretos serializados
        comodines_usados_semana INTEGER NOT NULL DEFAULT 0
      );

      -- series/pesos/tiempos de cada sesión
      CREATE TABLE sesiones_deporte (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        fecha TEXT NOT NULL,
        ejercicios_json TEXT NOT NULL
      );
      CREATE INDEX idx_sesiones_item_fecha ON sesiones_deporte(item_id, fecha);

      CREATE TABLE ajustes (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `,
  },
];
