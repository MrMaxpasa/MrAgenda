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
  {
    version: 2,
    descripcion:
      'Listas agrupadas con enlaces: los elementos legado (cuerpo «Lista: X») generan su contenedora y su enlace en-lista',
    sql: `
      -- contenedoras (tipo lista, título capitalizado) para cada nombre legado
      INSERT INTO items (id, tipo, titulo, todo_el_dia, nivel_aviso, estado, creado_en, actualizado_en)
      SELECT lower(hex(randomblob(16))), 'lista',
             upper(substr(nombre, 1, 1)) || substr(nombre, 2),
             1, 0, 'pendiente', datetime('now'), datetime('now')
      FROM (
        SELECT DISTINCT lower(trim(substr(cuerpo, 8))) AS nombre
        FROM items
        WHERE tipo = 'lista' AND cuerpo LIKE 'Lista: %'
      )
      WHERE nombre NOT IN (
        SELECT lower(titulo) FROM items
        WHERE tipo = 'lista' AND cuerpo IS NULL
      );

      -- enlaces elemento → contenedora
      INSERT OR IGNORE INTO enlaces (origen_id, destino_id, tipo)
      SELECT e.id, c.id, 'en-lista'
      FROM items e
      JOIN items c
        ON c.tipo = 'lista'
       AND c.cuerpo IS NULL
       AND lower(c.titulo) = lower(trim(substr(e.cuerpo, 8)))
      WHERE e.tipo = 'lista' AND e.cuerpo LIKE 'Lista: %';

      -- limpiar el marcador legado
      UPDATE items SET cuerpo = NULL WHERE tipo = 'lista' AND cuerpo LIKE 'Lista: %';
    `,
  },
  {
    version: 3,
    descripcion:
      'Regla de producto: una nota nunca lleva hora. Las notas con hora del legado pasan a tarea, conservando día, hora y aviso',
    sql: `
      UPDATE items
      SET tipo = 'tarea', actualizado_en = datetime('now')
      WHERE tipo = 'nota'
        AND todo_el_dia = 0
        AND fecha_inicio LIKE '%T%';
    `,
  },
];
